import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import { z } from "zod";
import { normalizeCatalogName, parseMaxMembers, personnelExcelHeaders as excelHeaders, unitCatalogRowKey, validatePersonnelExcelHeaders, validatePersonnelImportRow, validateUnitCatalogExcelHeaders, validateUnitCatalogImportRow } from "../shared/excel";
import { calculateAge, calculateServiceMonths, derivePersonnelStatus, getPersonnelAgeGroup, matchesPersonnelAgeGroup } from "../shared/personnel";
import * as db from "./db";
import { hashLocalPassword, normalizeLocalUsername, verifyLocalPassword } from "./local-auth";
import { createPersonnelTemplate } from "./personnel-template";
import { createStatisticsReport } from "./statistics-report";
import { createAccountHandoverReport } from "./account-report";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, delegatedAdminProcedure, passwordChangeProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hasLeaderDelegatedPermission, leaderDelegatedPermissionKeys } from "@shared/leader-permissions";

const nullableText = z.string().trim().max(4000).nullable().optional();
const optionalDate = z.date().nullable().optional();
const unitInput = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(255),
  unitType: z.enum(["province", "district", "ward", "team", "other"]),
  parentId: z.number().int().positive().nullable().optional(),
  maxMembers: z.number().int().min(0).max(999).default(0),
  address: nullableText,
  isActive: z.enum(["active", "inactive"]),
});

const personnelInput = z.object({
  fullName: z.string().trim().min(2).max(255),
  dateOfBirth: optionalDate,
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  citizenId: z.string().trim().regex(/^\d{9}(\d{3})?$/, "CCCD phải có 9 hoặc 12 chữ số").nullable().optional(),
  phone: z.string().trim().max(24).nullable().optional(),
  address: nullableText,
  village: z.string().trim().max(255).nullable().optional(),
  ethnicity: z.string().trim().max(100).nullable().optional(),
  religion: z.string().trim().max(100).nullable().optional(),
  educationLevel: z.string().trim().max(255).nullable().optional(),
  position: z.string().trim().max(255).nullable().optional(),
  unitId: z.number().int().positive(),
  joinedFormerForceAt: optionalDate,
  joinedAt: optionalDate,
  leftFormerForceAt: optionalDate,
  leftAt: optionalDate,
  policyResult: nullableText,
  certificateNumber: z.string().trim().max(100).nullable().optional(),
  commendation: nullableText,
  classification: z.enum(["excellent", "good", "completed", "not_completed"]).nullable().optional(),
  classificationDecision: z.string().trim().max(100).nullable().optional(),
  notes: nullableText,
});

const personnelTeamMappingInput = z.object({
  wardName: z.string().trim().min(2).max(255),
  sourceTeamName: z.string().trim().min(2).max(255),
  teamId: z.number().int().positive(),
});

const personnelCommendationInput = z.object({
  awardType: z.enum(["certificate_collective", "certificate_individual", "letter_collective", "letter_individual"]),
  decisionNumber: z.string().trim().min(1, "Nhập số quyết định").max(150),
  issuedAt: z.date(),
  issuingAgency: z.string().trim().min(2, "Nhập cơ quan ban hành").max(255),
  notes: nullableText,
});

const personnelTrainingInput = z.object({
  trainingName: z.string().trim().min(2, "Nhập tên đợt huấn luyện").max(255),
  decisionNumber: z.string().trim().min(1, "Nhập số quyết định").max(150),
  issuedAt: z.date(),
  issuingAgency: z.string().trim().min(2, "Nhập cơ quan ban hành").max(255),
  notes: nullableText,
});

const evidenceFileInput = z.object({ originalName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(3).max(150), base64: z.string().min(16).max(14_000_000) });

function enrichPersonnel<T extends { dateOfBirth: Date | null; joinedAt: Date | null; leftAt: Date | null }>(row: T) {
  const age = calculateAge(row.dateOfBirth);
  return {
    ...row,
    age,
    ageGroup: getPersonnelAgeGroup(row.dateOfBirth),
    serviceMonths: calculateServiceMonths(row.joinedAt, row.leftAt),
  };
}

const personnelFilterInput = z.object({
  keyword: z.string().max(255).optional(),
  unitId: z.number().int().positive().optional(),
  wardId: z.number().int().positive().optional(),
  wardIds: z.array(z.number().int().positive()).max(200).optional(),
  position: z.string().max(255).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  ageGroup: z.enum(["under_70", "from_70", "unknown"]).optional(),
});

function wardScopeForUser(user: any) {
  if (user.role !== "user") return null;
  if (!user.assignedWardId) throw new TRPCError({ code: "FORBIDDEN", message: "Tài khoản chưa được Admin phân công xã/phường quản lý" });
  return user.assignedWardId;
}

function requireWardEditor(user: any) {
  if (user.role === "admin") return null;
  if (user.role === "leader") {
    if (!hasLeaderDelegatedPermission(user.adminPermissions, "managePersonnel")) throw new TRPCError({ code: "FORBIDDEN", message: "Tài khoản Lãnh đạo chưa được Admin cấp quyền quản lý hồ sơ" });
    return null;
  }
  if (!user.canEditPersonnel) throw new TRPCError({ code: "FORBIDDEN", message: "Quyền chỉnh sửa đang đóng. Gửi yêu cầu để Admin phê duyệt trước khi cập nhật dữ liệu" });
  return wardScopeForUser(user);
}

function resolvePersonnelWardScope(user: any, input?: z.infer<typeof personnelFilterInput>): number[] | null {
  const assignedWardId = wardScopeForUser(user);
  const requestedWardIds = Array.from(new Set(input?.wardIds?.length ? input.wardIds : input?.wardId ? [input.wardId] : []));
  if (assignedWardId) {
    if (requestedWardIds.some(wardId => wardId !== assignedWardId)) throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ được tra cứu và xuất dữ liệu thuộc xã/phường được phân công" });
    return [assignedWardId];
  }
  return requestedWardIds.length ? requestedWardIds : null;
}

const bm1ReportInput = z.object({
  wardIds: z.array(z.number().int().positive()).max(135).optional(),
  periodMode: z.enum(["fixed", "custom"]).default("fixed"),
  reportingMonth: z.string().regex(/^\d{4}-\d{2}$/, "Tháng báo cáo phải theo dạng YYYY-MM").optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu phải theo dạng YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc phải theo dạng YYYY-MM-DD").optional(),
});

function resolveBm1WardScope(user: any, input: z.infer<typeof bm1ReportInput>) {
  const assignedWardId = wardScopeForUser(user);
  const requestedWardIds = Array.from(new Set(input.wardIds ?? []));
  if (assignedWardId) {
    if (requestedWardIds.some(wardId => wardId !== assignedWardId)) throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ được xuất biểu mẫu BM1 của xã/phường được phân công" });
    return [assignedWardId];
  }
  if (!requestedWardIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy tích chọn ít nhất một xã/phường trước khi xuất biểu mẫu BM1" });
  return requestedWardIds;
}

function resolveBm1Period(input: z.infer<typeof bm1ReportInput>) {
  const parseDate = (value: string, endOfDay = false) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new TRPCError({ code: "BAD_REQUEST", message: "Ngày báo cáo không hợp lệ" });
    return date;
  };
  if (input.periodMode === "custom") {
    if (!input.startDate || !input.endDate) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy chọn đủ ngày bắt đầu và ngày kết thúc" });
    const startDate = parseDate(input.startDate);
    const endDate = parseDate(input.endDate, true);
    if (startDate > endDate) throw new TRPCError({ code: "BAD_REQUEST", message: "Ngày bắt đầu không được sau ngày kết thúc" });
    return { startDate, endDate, label: `Từ ngày ${input.startDate.split("-").reverse().join("/")} đến ngày ${input.endDate.split("-").reverse().join("/")}` };
  }
  const [year, month] = (input.reportingMonth ?? new Date().toISOString().slice(0, 7)).split("-").map(Number);
  const startDate = new Date(year, month - 2, 15);
  const endDate = new Date(year, month - 1, 14, 23, 59, 59, 999);
  return { startDate, endDate, label: `Kỳ cố định từ ngày ${String(startDate.getDate()).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${startDate.getFullYear()} đến ngày ${String(endDate.getDate()).padStart(2, "0")}/${String(endDate.getMonth() + 1).padStart(2, "0")}/${endDate.getFullYear()}` };
}

async function queryPersonnelWithFilters(input: z.infer<typeof personnelFilterInput> | undefined, user: any) {
  const rows = (await db.listPersonnel(input, resolvePersonnelWardScope(user, input))).map(enrichPersonnel);
  return input?.ageGroup ? rows.filter(row => matchesPersonnelAgeGroup(row.dateOfBirth, input.ageGroup)) : rows;
}

async function requirePersonnelRecordEditor(user: any, personnelId: number) {
  const wardId = requireWardEditor(user);
  const detail = await db.getPersonnelDetail(personnelId, wardId ?? undefined);
  if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy hồ sơ trong phạm vi quản lý" });
  return detail;
}

function validateEvidenceFile(input: z.infer<typeof evidenceFileInput>) {
  const allowed = input.mimeType.startsWith("image/") || input.mimeType === "application/pdf";
  if (!allowed) throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ chấp nhận ảnh hoặc tệp PDF" });
  const bytes = base64ToBuffer(input.base64);
  if (bytes.length > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Dung lượng tệp không vượt quá 10 MB" });
  return bytes;
}

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

function normalizeClassification(value: unknown): "excellent" | "good" | "completed" | "not_completed" | null {
  const text = cleanText(value)?.toLocaleLowerCase("vi") ?? "";
  if (!text) return null;
  if (text === "excellent" || text.includes("hoàn thành xuất sắc")) return "excellent";
  if (text === "good" || text.includes("hoàn thành tốt")) return "good";
  if (text === "not_completed" || text.includes("không hoàn thành")) return "not_completed";
  if (text === "completed" || text.includes("hoàn thành nhiệm vụ")) return "completed";
  return null;
}

function cleanCitizenId(value: unknown): string | null {
  const raw = cleanText(value);
  return raw ? raw.replace(/[\s.-]+/g, "") : null;
}

function normalizedCatalogText(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

function normalizedTeamBase(value: string) {
  return normalizedCatalogText(value).replace(/\s+(bắc|nam|đông|tây|trung)$/, "");
}

async function validateTeamRelationship(input: z.infer<typeof unitInput>) {
  if (input.unitType !== "team") {
    if (input.maxMembers > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ Tổ mới được thiết lập số lượng thành viên tối đa" });
    return;
  }
  if (!input.parentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Tổ phải được liên kết với một xã/phường" });
  const parent = (await db.listUnits()).find(unit => unit.id === input.parentId);
  if (!parent || parent.unitType !== "ward") throw new TRPCError({ code: "BAD_REQUEST", message: "Xã/phường được chọn không hợp lệ" });
}

async function validatePersonnelTeamAssignment(unitId: number, wardId?: number | null) {
  if (wardId && !(await db.teamBelongsToWard(unitId, wardId))) throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ được chọn Tổ thuộc xã/phường được phân công" });
  const team = (await db.listUnits(wardId)).find(unit => unit.id === unitId);
  if (!team || team.unitType !== "team") throw new TRPCError({ code: "BAD_REQUEST", message: "Hồ sơ nhân sự phải được gắn vào một Tổ hợp lệ" });
}

function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0 || value >= 100_000) return null;
    // Excel's 1900 date system, including its historical leap-year offset.
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + Math.floor(value) * 24 * 60 * 60 * 1000);
  }
  const normalized = String(value).trim();
  const vn = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (vn) return new Date(Date.UTC(Number(vn[3]), Number(vn[2]) - 1, Number(vn[1])));
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function describePersonnelInsertError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/incorrect (timestamp|datetime)|dateofbirth/i.test(message)) return "Ngày sinh không thể lưu; kiểm tra lại định dạng ngày";
  if (/foreign key|constraint/i.test(message)) return "Tổ được chọn không còn hợp lệ; tải lại file mẫu và chọn lại Xã/phường, Tên Tổ";
  if (/data too long/i.test(message)) return "Có trường dữ liệu vượt quá độ dài cho phép; rút ngắn nội dung ở dòng này";
  return "Không thể lưu hồ sơ ở dòng này; kiểm tra lại các trường dữ liệu rồi nhập lại";
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(value) : "";
}

function normalizeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function base64ToBuffer(base64: string) {
  const payload = base64.includes(",") ? base64.split(",").pop()! : base64;
  return Buffer.from(payload, "base64");
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localLogin: publicProcedure.input(z.object({ username: z.string().min(3).max(80), password: z.string().min(1).max(256) })).mutation(async ({ ctx, input }) => {
      const username = normalizeLocalUsername(input.username);
      const account = await db.getLocalUserByUsername(username);
      const valid = Boolean(account?.passwordHash) && await verifyLocalPassword(input.password, account!.passwordHash!);
      if (!account || !valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Tên đăng nhập hoặc mật khẩu không đúng" });
      await db.markLocalUserSignedIn(account.id);
      const token = await (await import("./_core/sdk")).sdk.createSessionToken(account.openId, { name: account.name ?? username, expiresInMs: 30 * 24 * 60 * 60 * 1000 });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true, mustChangePassword: account.mustChangePassword } as const;
    }),
    changeLocalPassword: passwordChangeProcedure.input(z.object({ currentPassword: z.string().min(1).max(256), newPassword: z.string().min(8).max(256) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.loginMethod !== "local" || !ctx.user.passwordHash) throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ tài khoản nội bộ mới có thể đổi mật khẩu tại đây" });
      if (!(await verifyLocalPassword(input.currentPassword, ctx.user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Mật khẩu hiện tại không đúng" });
      if (input.currentPassword === input.newPassword) throw new TRPCError({ code: "BAD_REQUEST", message: "Mật khẩu mới phải khác mật khẩu hiện tại" });
      await db.completeLocalPasswordChange(ctx.user.id, await hashLocalPassword(input.newPassword));
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  units: router({
    list: protectedProcedure.query(({ ctx }) => db.listUnits(wardScopeForUser(ctx.user))),
    template: protectedProcedure.query(() => {
      const sheet = XLSX.utils.json_to_sheet([{ "Tên xã, phường": "", "Tên đơn vị/tổ": "", "Số lượng thành viên tối đa": "" }]);
      sheet["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 30 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "DanhMucDonVi");
      return { filename: "mau-cap-nhat-xa-phuong-don-vi-to.xlsx", base64: XLSX.write(workbook, { bookType: "xlsx", type: "base64" }) };
    }),
    importCatalog: delegatedAdminProcedure("manageUnits").input(z.object({ base64: z.string().min(32).max(20_000_000) })).mutation(async ({ input }) => {
      const workbook = XLSX.read(base64ToBuffer(input.base64), { type: "buffer", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!firstSheet) throw new TRPCError({ code: "BAD_REQUEST", message: "Không tìm thấy trang dữ liệu trong file Excel" });
      const headerRows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: null, raw: true });
      const headerValidation = validateUnitCatalogExcelHeaders(headerRows[0] ?? []);
      if (!headerValidation.valid) throw new TRPCError({ code: "BAD_REQUEST", message: `File Excel thiếu hoặc sai tiêu đề cột: ${headerValidation.missing.join(", ")}` });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null, raw: true });
      if (!rows.length) return { totalWards: 0, totalTeams: 0, removedWards: 0, removedUnits: 0, errors: [] as Array<{ row: number; message: string }> };

      const existingUnits = await db.listUnits();
      const seenRows = new Set<string>();
      const pendingRows: Array<{ wardName: string; unitName: string | null; maxMembers: number }> = [];
      const errors: Array<{ row: number; message: string }> = [];

      rows.forEach((row, index) => {
        const wardName = cleanText(row["Tên xã, phường"]);
        const unitName = cleanText(row["Tên đơn vị/tổ"]);
        const maxMembersRaw = row["Số lượng thành viên tối đa"];
        const validation = validateUnitCatalogImportRow({ wardName, unitName, maxMembers: maxMembersRaw, seenKeys: seenRows });
        if (!validation.valid) { errors.push({ row: index + 2, message: validation.errors.join("; ") }); return; }
        pendingRows.push({ wardName: wardName!, unitName, maxMembers: parseMaxMembers(maxMembersRaw) ?? 0 });
      });
      if (errors.length) return { totalWards: 0, totalTeams: 0, removedWards: 0, removedUnits: 0, errors };

      const imported = await db.importUnitCatalog(pendingRows);
      return { ...imported, errors };
    }),
    create: delegatedAdminProcedure("manageUnits").input(unitInput).mutation(async ({ input }) => { await validateTeamRelationship(input); return db.createUnit(input); }),
    update: delegatedAdminProcedure("manageUnits").input(z.object({ id: z.number().int().positive(), payload: unitInput })).mutation(async ({ input }) => { await validateTeamRelationship(input.payload); return db.updateUnit(input.id, input.payload); }),
    remove: delegatedAdminProcedure("manageUnits").input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.removeUnit(input.id)),
    staffing: protectedProcedure.query(({ ctx }) => db.getTeamStaffing(wardScopeForUser(ctx.user))),
  }),
  personnel: router({
    list: protectedProcedure.input(personnelFilterInput.optional()).query(({ ctx, input }) => queryPersonnelWithFilters(input, ctx.user)),
    detail: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const result = await db.getPersonnelDetail(input.id, wardScopeForUser(ctx.user));
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy hồ sơ nhân sự" });
      return { ...result, personnel: enrichPersonnel(result.personnel) };
    }),
    create: protectedProcedure.input(personnelInput).mutation(async ({ ctx, input }) => { const wardId = requireWardEditor(ctx.user); await validatePersonnelTeamAssignment(input.unitId, wardId); return db.createPersonnel(input, derivePersonnelStatus(input.leftAt)); }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), payload: personnelInput })).mutation(async ({ ctx, input }) => {
      const wardId = requireWardEditor(ctx.user);
      const requiresExisting = Boolean(wardId) || input.payload.leftAt === undefined;
      const existing = requiresExisting ? await db.getPersonnelDetail(input.id, wardId) : undefined;
      if (requiresExisting && !existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy hồ sơ nhân sự trong phạm vi quản lý" });
      const effectiveLeftAt = input.payload.leftAt === undefined ? existing!.personnel.leftAt : input.payload.leftAt;
      await validatePersonnelTeamAssignment(input.payload.unitId, wardId);
      return db.updatePersonnel(input.id, input.payload, derivePersonnelStatus(effectiveLeftAt));
    }),
    commendations: router({
      create: protectedProcedure.input(z.object({ personnelId: z.number().int().positive(), payload: personnelCommendationInput })).mutation(async ({ ctx, input }) => { await requirePersonnelRecordEditor(ctx.user, input.personnelId); return db.createPersonnelCommendation(input.personnelId, input.payload); }),
      update: protectedProcedure.input(z.object({ id: z.number().int().positive(), payload: personnelCommendationInput })).mutation(async ({ ctx, input }) => { const record = await db.getPersonnelCommendation(input.id); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy quyết định khen thưởng" }); await requirePersonnelRecordEditor(ctx.user, record.personnelId); return db.updatePersonnelCommendation(input.id, input.payload); }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const record = await db.getPersonnelCommendation(input.id); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy quyết định khen thưởng" }); await requirePersonnelRecordEditor(ctx.user, record.personnelId); return db.removePersonnelCommendation(input.id); }),
      uploadFile: protectedProcedure.input(z.object({ commendationId: z.number().int().positive(), file: evidenceFileInput })).mutation(async ({ ctx, input }) => { const record = await db.getPersonnelCommendation(input.commendationId); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy quyết định khen thưởng" }); await requirePersonnelRecordEditor(ctx.user, record.personnelId); const bytes = validateEvidenceFile(input.file); const stored = await storagePut(`personnel/${record.personnelId}/commendations/${input.commendationId}/${normalizeFileName(input.file.originalName)}`, bytes, input.file.mimeType); const id = await db.addPersonnelCommendationFile({ commendationId: input.commendationId, originalName: input.file.originalName, storageKey: stored.key, storageUrl: stored.url, mimeType: input.file.mimeType }); return { id, ...stored }; }),
      removeFile: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const file = await db.getPersonnelCommendationFile(input.id); if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tệp minh chứng" }); await requirePersonnelRecordEditor(ctx.user, file.personnelId); return db.removePersonnelCommendationFile(input.id); }),
    }),
    trainings: router({
      create: protectedProcedure.input(z.object({ personnelId: z.number().int().positive(), payload: personnelTrainingInput })).mutation(async ({ ctx, input }) => { await requirePersonnelRecordEditor(ctx.user, input.personnelId); return db.createPersonnelTraining(input.personnelId, input.payload); }),
      update: protectedProcedure.input(z.object({ id: z.number().int().positive(), payload: personnelTrainingInput })).mutation(async ({ ctx, input }) => { const record = await db.getPersonnelTraining(input.id); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đợt huấn luyện" }); await requirePersonnelRecordEditor(ctx.user, record.personnelId); return db.updatePersonnelTraining(input.id, input.payload); }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const record = await db.getPersonnelTraining(input.id); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đợt huấn luyện" }); await requirePersonnelRecordEditor(ctx.user, record.personnelId); return db.removePersonnelTraining(input.id); }),
      uploadFile: protectedProcedure.input(z.object({ trainingId: z.number().int().positive(), file: evidenceFileInput })).mutation(async ({ ctx, input }) => { const record = await db.getPersonnelTraining(input.trainingId); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đợt huấn luyện" }); await requirePersonnelRecordEditor(ctx.user, record.personnelId); const bytes = validateEvidenceFile(input.file); const stored = await storagePut(`personnel/${record.personnelId}/trainings/${input.trainingId}/${normalizeFileName(input.file.originalName)}`, bytes, input.file.mimeType); const id = await db.addPersonnelTrainingFile({ trainingId: input.trainingId, originalName: input.file.originalName, storageKey: stored.key, storageUrl: stored.url, mimeType: input.file.mimeType }); return { id, ...stored }; }),
      removeFile: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const file = await db.getPersonnelTrainingFile(input.id); if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tệp minh chứng" }); await requirePersonnelRecordEditor(ctx.user, file.personnelId); return db.removePersonnelTrainingFile(input.id); }),
    }),
    remove: delegatedAdminProcedure("deletePersonnel").input(z.object({ ids: z.array(z.number().int().positive()).min(1) })).mutation(({ input }) => db.removePersonnel(input.ids)),
    transferUnit: delegatedAdminProcedure("transferData").input(z.object({ fromUnitId: z.number().int().positive(), toUnitId: z.number().int().positive() })).mutation(async ({ input }) => {
      await validatePersonnelTeamAssignment(input.toUnitId);
      const moved = await db.transferPersonnelUnit(input.fromUnitId, input.toUnitId);
      return { moved };
    }),
    uploadFile: protectedProcedure.input(z.object({ personnelId: z.number().int().positive(), fileType: z.enum(["portrait", "recruitment_decision", "resignation_decision", "other"]), originalName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(3).max(150), base64: z.string().min(16).max(14_000_000) })).mutation(async ({ ctx, input }) => {
      const wardId = requireWardEditor(ctx.user);
      if (wardId && !(await db.personnelBelongsToWard(input.personnelId, wardId))) throw new TRPCError({ code: "FORBIDDEN", message: "Không thể tải tệp cho hồ sơ ngoài xã/phường được phân công" });
      const isImage = input.mimeType.startsWith("image/");
      const allowed = isImage || input.mimeType === "application/pdf";
      if (!allowed) throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ chấp nhận ảnh hoặc tệp PDF" });
      const bytes = base64ToBuffer(input.base64);
      if (bytes.length > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Dung lượng tệp không vượt quá 10 MB" });
      const stored = await storagePut(`personnel/${input.personnelId}/${normalizeFileName(input.originalName)}`, bytes, input.mimeType);
      const fileId = await db.addPersonnelFile({ personnelId: input.personnelId, fileType: input.fileType, originalName: input.originalName, storageKey: stored.key, storageUrl: stored.url, mimeType: input.mimeType });
      return { id: fileId, ...stored };
    }),
    removeFile: delegatedAdminProcedure("deletePersonnel").input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.removePersonnelFile(input.id)),
  }),
  deletionRequests: router({
    mine: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ User xã/phường được xem yêu cầu xóa do mình gửi" });
      return db.listDeletionRequests(ctx.user.id);
    }),
    list: delegatedAdminProcedure("deletePersonnel").query(() => db.listDeletionRequests()),
    create: protectedProcedure.input(z.object({ personnelId: z.number().int().positive(), reason: z.string().trim().min(10, "Vui lòng nêu lý do xóa tối thiểu 10 ký tự").max(2000) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ User xã/phường được gửi yêu cầu xóa" });
      const wardId = wardScopeForUser(ctx.user);
      const detail = await db.getPersonnelDetail(input.personnelId, wardId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy hồ sơ trong phạm vi xã/phường được phân công" });
      return db.createDeletionRequest({ personnelId: input.personnelId, personnelName: detail.personnel.fullName, reason: input.reason, requesterUserId: ctx.user.id });
    }),
    uploadEvidence: protectedProcedure.input(z.object({ deletionRequestId: z.number().int().positive(), originalName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(3).max(150), base64: z.string().min(16).max(14_000_000) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ User xã/phường được đính kèm minh chứng cho yêu cầu xóa" });
      wardScopeForUser(ctx.user);
      const request = await db.getDeletionRequestForRequester(input.deletionRequestId, ctx.user.id);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu xóa do tài khoản này gửi" });
      if (request.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ được đính kèm minh chứng khi yêu cầu đang chờ xử lý" });
      const allowed = input.mimeType.startsWith("image/") || input.mimeType === "application/pdf";
      if (!allowed) throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ chấp nhận ảnh hoặc tệp PDF" });
      const bytes = base64ToBuffer(input.base64);
      if (bytes.length > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Dung lượng tệp không vượt quá 10 MB" });
      const stored = await storagePut(`deletion-requests/${input.deletionRequestId}/${normalizeFileName(input.originalName)}`, bytes, input.mimeType);
      const fileId = await db.addDeletionRequestFile({ deletionRequestId: input.deletionRequestId, originalName: input.originalName, storageKey: stored.key, storageUrl: stored.url, mimeType: input.mimeType });
      return { id: fileId, ...stored };
    }),
    reject: delegatedAdminProcedure("deletePersonnel").input(z.object({ id: z.number().int().positive(), decisionNote: z.string().trim().max(1000).nullable().optional() })).mutation(({ ctx, input }) => db.rejectDeletionRequest(input.id, ctx.user.id, input.decisionNote ?? null)),
    execute: delegatedAdminProcedure("deletePersonnel").input(z.object({ id: z.number().int().positive(), decisionNote: z.string().trim().max(1000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const result = await db.executeDeletionRequest(input.id, ctx.user.id, input.decisionNote ?? null);
      return result;
    }),
  }),
  dashboard: router({
    stats: protectedProcedure.query(({ ctx }) => db.getDashboardStats(wardScopeForUser(ctx.user))),
  }),
  editAccess: router({
    mine: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "user") return null;
      return db.getMyEditAccessRequest(ctx.user.id);
    }),
    request: protectedProcedure.input(z.object({ reason: z.string().trim().min(10).max(2000) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ User xã/phường được gửi yêu cầu mở quyền chỉnh sửa" });
      const wardId = wardScopeForUser(ctx.user);
      if (ctx.user.canEditPersonnel) throw new TRPCError({ code: "BAD_REQUEST", message: "Quyền chỉnh sửa hiện đang được Admin mở" });
      try {
        return await db.createEditAccessRequest({ requesterUserId: ctx.user.id, wardId, reason: input.reason });
      } catch (error) {
        throw new TRPCError({ code: "CONFLICT", message: error instanceof Error ? error.message : "Không thể gửi yêu cầu mở quyền chỉnh sửa" });
      }
    }),
    list: delegatedAdminProcedure("manageAccounts").input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional()).query(({ input }) => db.listEditAccessRequests(input?.status)),
    review: delegatedAdminProcedure("manageAccounts").input(z.object({ id: z.number().int().positive(), approve: z.boolean(), decisionNote: z.string().trim().max(1000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      try {
        await db.reviewEditAccessRequest({ id: input.id, reviewerUserId: ctx.user.id, approve: input.approve, decisionNote: input.decisionNote ?? null });
        return { success: true } as const;
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Không thể xử lý yêu cầu" });
      }
    }),
  }),
  users: router({
    list: delegatedAdminProcedure("manageAccounts").query(() => db.listUsers()),
    exportAccounts: adminProcedure.query(async () => {
      const report = createAccountHandoverReport(await db.listUsers());
      return { filename: "danh-sach-tai-khoan-he-thong.xlsx", base64: report.toString("base64") };
    }),
    createLocalAccount: delegatedAdminProcedure("manageAccounts").input(z.object({ name: z.string().trim().min(2).max(255), username: z.string().trim().min(3).max(80), password: z.string().min(8).max(256), role: z.enum(["leader", "user"]), assignedWardId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "leader" && input.role === "leader") throw new TRPCError({ code: "FORBIDDEN", message: "Lãnh đạo được ủy quyền chỉ có thể tạo tài khoản User xã/phường" });
      const assignedWardId = input.assignedWardId ?? null;
      if (input.role === "user") {
        if (!assignedWardId) throw new TRPCError({ code: "BAD_REQUEST", message: "User xã/phường phải được phân công đúng một xã/phường" });
        const ward = (await db.listUnits()).find(unit => unit.id === assignedWardId && unit.unitType === "ward");
        if (!ward) throw new TRPCError({ code: "BAD_REQUEST", message: "Xã/phường được phân công không hợp lệ" });
      }
      const username = normalizeLocalUsername(input.username);
      const existing = await db.getLocalUserByUsername(username);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Tên đăng nhập đã tồn tại" });
      try {
        return await db.createLocalUser({ name: input.name, username, passwordHash: await hashLocalPassword(input.password), role: input.role, assignedWardId: input.role === "user" ? assignedWardId : null });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Không thể tạo tài khoản nội bộ" });
      }
    }),
    resetLocalPassword: delegatedAdminProcedure("manageAccounts").input(z.object({ id: z.number().int().positive(), password: z.string().min(8).max(256) })).mutation(async ({ input }) => {
      await db.resetLocalUserPassword(input.id, await hashLocalPassword(input.password));
      return { success: true } as const;
    }),
    updateAccess: delegatedAdminProcedure("manageAccounts").input(z.object({ id: z.number().int().positive(), role: z.enum(["admin", "leader", "user"]), assignedWardId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "leader" && input.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Lãnh đạo được ủy quyền chỉ có thể thiết lập quyền cho User xã/phường" });
      if (input.id === ctx.user.id && input.role !== "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể tự gỡ quyền Admin của tài khoản hiện tại" });
      const assignedWardId = input.assignedWardId ?? null;
      if (input.role === "user") {
        if (!assignedWardId) throw new TRPCError({ code: "BAD_REQUEST", message: "User xã/phường phải được phân công đúng một xã/phường" });
        const ward = (await db.listUnits()).find(unit => unit.id === assignedWardId && unit.unitType === "ward");
        if (!ward) throw new TRPCError({ code: "BAD_REQUEST", message: "Xã/phường được phân công không hợp lệ" });
      }
      return db.updateUserAccess(input.id, input.role, assignedWardId);
    }),
    setPersonnelEditPermission: delegatedAdminProcedure("manageAccounts").input(z.object({ id: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ input }) => {
      await db.setUserPersonnelEditPermission(input.id, input.enabled);
      return { success: true } as const;
    }),
    updateRole: delegatedAdminProcedure("manageAccounts").input(z.object({ id: z.number().int().positive(), role: z.enum(["admin", "leader", "user"]), assignedWardId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "leader" && input.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Lãnh đạo được ủy quyền chỉ có thể thiết lập quyền cho User xã/phường" });
      if (input.id === ctx.user.id && input.role !== "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể tự gỡ quyền Admin của tài khoản hiện tại" });
      const assignedWardId = input.assignedWardId ?? null;
      if (input.role === "user") {
        if (!assignedWardId) throw new TRPCError({ code: "BAD_REQUEST", message: "User xã/phường phải được phân công đúng một xã/phường" });
        const ward = (await db.listUnits()).find(unit => unit.id === assignedWardId && unit.unitType === "ward");
        if (!ward) throw new TRPCError({ code: "BAD_REQUEST", message: "Xã/phường được phân công không hợp lệ" });
      }
      return db.updateUserAccess(input.id, input.role, assignedWardId);
    }),
    updateLeaderPermissions: adminProcedure.input(z.object({ id: z.number().int().positive(), permissions: z.array(z.enum(leaderDelegatedPermissionKeys)).max(leaderDelegatedPermissionKeys.length) })).mutation(async ({ input }) => {
      await db.updateLeaderDelegatedPermissions(input.id, JSON.stringify(Array.from(new Set(input.permissions))));
      return { success: true } as const;
    }),
  }),
  mobileSync: router({
    listTokens: delegatedAdminProcedure("manageMobileSync").query(() => db.listMobileSyncTokens()),
    listLogs: delegatedAdminProcedure("manageMobileSync").input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional()).query(({ input }) => db.listMobileSyncLogs(input?.limit)),
    createToken: delegatedAdminProcedure("manageMobileSync").input(z.object({ label: z.string().trim().min(3).max(120), wardId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const wardId = input.wardId ?? null;
      if (wardId) {
        const ward = (await db.listUnits()).find(unit => unit.id === wardId && unit.unitType === "ward");
        if (!ward) throw new TRPCError({ code: "BAD_REQUEST", message: "Xã/phường không hợp lệ" });
      }
      return db.createMobileSyncToken({ label: input.label, wardId, createdByUserId: ctx.user.id });
    }),
    revokeToken: delegatedAdminProcedure("manageMobileSync").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await db.revokeMobileSyncToken(input.id);
      return { success: true } as const;
    }),
  }),
  backup: router({
    listLogs: delegatedAdminProcedure("manageBackup").query(() => db.listBackupLogs()),
    record: delegatedAdminProcedure("manageBackup").input(z.object({ actionType: z.enum(["backup", "restore", "import", "export"]), status: z.enum(["success", "failed"]), fileName: z.string().max(255).nullable().optional(), storageKey: z.string().max(512).nullable().optional(), notes: z.string().max(4000).nullable().optional() })).mutation(({ ctx, input }) => db.createBackupLog({ ...input, actorUserId: ctx.user.id })),
  }),
  excel: router({
    template: protectedProcedure.query(async () => {
      const template = await createPersonnelTemplate(excelHeaders, await db.listUnits());
      return { filename: "mau-nhap-luc-luong-antt.xlsx", base64: template.toString("base64") };
    }),
    exportPersonnel: protectedProcedure.input(personnelFilterInput.optional()).query(async ({ ctx, input }) => {
      const rows = (await queryPersonnelWithFilters(input, ctx.user)).map((enriched, index) => {
        const row = enriched;
        return {
          STT: index + 1, "Họ và tên": row.fullName, "Ngày sinh": formatDate(row.dateOfBirth), "Giới tính": row.gender === "male" ? "Nam" : row.gender === "female" ? "Nữ" : "Khác", CCCD: row.citizenId ?? "", "Số điện thoại": row.phone ?? "", "Địa chỉ": row.address || row.village || "", "Dân tộc": row.ethnicity ?? "", "Tôn giáo": row.religion ?? "", "Trình độ": row.educationLevel ?? "", "Chức vụ": row.position ?? "", "Tổ bảo vệ an ninh, trật tự": row.unitName ?? "", "Ngày tham gia": formatDate(row.joinedAt), "Ngày thôi tham gia": formatDate(row.leftAt), "Trạng thái": row.status === "active" ? "Đang tham gia" : "Thôi tham gia", "Tuổi": enriched.age ?? "", "Nhóm tuổi": enriched.ageGroup === "from_70" ? "Từ 70 tuổi" : "Dưới 70 tuổi", "Thời gian công tác (tháng)": enriched.serviceMonths ?? "", "Kết quả chính sách": row.policyResult ?? "", "Ghi chú": row.notes ?? "",
        };
      });
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = Object.keys(rows[0] ?? { "Họ và tên": "" }).map(key => ({ wch: Math.max(14, Math.min(30, key.length + 8)) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "DanhSachNhanSu");
      return { filename: "danh-sach-luc-luong-antt.xlsx", base64: XLSX.write(workbook, { bookType: "xlsx", type: "base64" }) };
    }),
    exportStatisticsReport: protectedProcedure.input(bm1ReportInput.optional()).query(async ({ ctx, input }) => {
      const reportInput = input ?? { periodMode: "fixed" as const };
      const wardIds = resolveBm1WardScope(ctx.user, reportInput);
      const period = resolveBm1Period(reportInput);
      const [units, personnelRows, activities] = await Promise.all([db.listUnits(), db.listPersonnel({}, wardIds), db.listBm1Activities(wardIds)]);
      const report = await createStatisticsReport(units, personnelRows, wardIds, period, activities);
      return { filename: "bieu-mau-01-thong-ke-luc-luong-antt.xlsx", base64: report.toString("base64") };
    }),
    analyzeTeamMappings: delegatedAdminProcedure("manageBackup").input(z.object({ base64: z.string().min(32).max(20_000_000) })).mutation(async ({ input }) => {
      const workbook = XLSX.read(base64ToBuffer(input.base64), { type: "buffer", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!firstSheet) throw new TRPCError({ code: "BAD_REQUEST", message: "Không tìm thấy trang dữ liệu trong file Excel" });
      const headerRows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: null, raw: true });
      const headerValidation = validatePersonnelExcelHeaders(headerRows[0] ?? []);
      if (!headerValidation.valid) throw new TRPCError({ code: "BAD_REQUEST", message: `File Excel thiếu hoặc sai tiêu đề cột: ${headerValidation.missing.join(", ")}` });
      const headers = new Set((headerRows[0] ?? []).map(value => String(value ?? "").replace(/^\uFEFF/, "").trim()));
      if (!headers.has("TenTo")) throw new TRPCError({ code: "BAD_REQUEST", message: "File cần có hai cột Xa/Phuong và TenTo để đối soát Tổ hàng loạt" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null, raw: true });
      const allUnits = await db.listUnits();
      const wardsByName = new Map(allUnits.filter(unit => unit.unitType === "ward").map(unit => [normalizedCatalogText(unit.name), unit]));
      const teams = allUnits.filter(unit => unit.unitType === "team" && unit.parentId);
      const teamByWardAndName = new Map(teams.map(unit => [`${unit.parentId}|${normalizedCatalogText(unit.name)}`, unit]));
      const unresolved = new Map<string, { wardName: string; sourceTeamName: string; rows: number[]; candidates: Array<{ id: number; name: string }>; suggestedTeamId: number | null }>();
      rows.forEach((row, index) => {
        const wardName = cleanText(row["Xa/Phuong"]);
        const sourceTeamName = cleanText(row.TenTo);
        if (!wardName || !sourceTeamName) return;
        const ward = wardsByName.get(normalizedCatalogText(wardName));
        if (!ward || teamByWardAndName.has(`${ward.id}|${normalizedCatalogText(sourceTeamName)}`)) return;
        const key = `${normalizedCatalogText(wardName)}|${normalizedCatalogText(sourceTeamName)}`;
        const existing = unresolved.get(key);
        if (existing) { existing.rows.push(index + 2); return; }
        const wardTeams = teams.filter(team => team.parentId === ward.id).map(team => ({ id: team.id, name: team.name }));
        const sourceBase = normalizedTeamBase(sourceTeamName);
        const closeMatches = wardTeams.filter(team => normalizedCatalogText(team.name).startsWith(sourceBase) || sourceBase.startsWith(normalizedTeamBase(team.name)));
        unresolved.set(key, { wardName, sourceTeamName, rows: [index + 2], candidates: wardTeams, suggestedTeamId: closeMatches.length === 1 ? closeMatches[0].id : null });
      });
      return { totalRows: rows.length, groups: Array.from(unresolved.values()).sort((a, b) => b.rows.length - a.rows.length) };
    }),
    importPersonnel: delegatedAdminProcedure("manageBackup").input(z.object({ base64: z.string().min(32).max(20_000_000), teamMappings: z.array(personnelTeamMappingInput).max(2_000).optional() })).mutation(async ({ input }) => {
      const workbook = XLSX.read(base64ToBuffer(input.base64), { type: "buffer", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!firstSheet) throw new TRPCError({ code: "BAD_REQUEST", message: "Không tìm thấy trang dữ liệu trong file Excel" });
      const headerRows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: null, raw: true });
      const headerValidation = validatePersonnelExcelHeaders(headerRows[0] ?? []);
      if (!headerValidation.valid) throw new TRPCError({ code: "BAD_REQUEST", message: `File Excel thiếu hoặc sai tiêu đề cột: ${headerValidation.missing.join(", ")}` });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null, raw: true });
      if (!rows.length) return { imported: 0, errors: [] as Array<{ row: number; message: string }> };
      const allUnits = await db.listUnits();
      const availableUnits = allUnits.filter(unit => unit.unitType === "team");
      const unitByName = new Map(availableUnits.map(unit => [unit.name.trim().toLocaleLowerCase("vi"), unit]));
      const wardByName = new Map(allUnits.filter(unit => unit.unitType === "ward").map(unit => [unit.name.trim().toLocaleLowerCase("vi"), unit]));
      const teamByWardAndName = new Map(availableUnits.filter(unit => unit.parentId).map(unit => [`${unit.parentId}|${unit.name.trim().toLocaleLowerCase("vi")}`, unit]));
      const teamById = new Map(availableUnits.map(unit => [unit.id, unit]));
      const mappingBySource = new Map((input.teamMappings ?? []).map(mapping => [`${normalizedCatalogText(mapping.wardName)}|${normalizedCatalogText(mapping.sourceTeamName)}`, mapping.teamId]));
      const headers = new Set((headerRows[0] ?? []).map(value => String(value ?? "").replace(/^\uFEFF/, "").trim()));
      const usesNewTeamColumn = headers.has("TenTo");
      const errors: Array<{ row: number; message: string }> = [];
      const validRows: Array<{ row: number; record: z.infer<typeof personnelInput> }> = [];
      rows.forEach((row, index) => {
        const fullName = cleanText(row.HoTen ?? row["Họ và tên"]);
        const citizenId = cleanCitizenId(row.CCCD);
        const dateOfBirthRaw = row.NgaySinh ?? row["Ngày sinh"];
        const dateOfBirth = dateOfBirthRaw ? parseExcelDate(dateOfBirthRaw) : null;
        const wardName = cleanText(row["Xa/Phuong"]);
        const unitName = cleanText(usesNewTeamColumn ? row.TenTo : row["Xa/Phuong"] ?? row["Đơn vị"]);
        const validation = validatePersonnelImportRow({ fullName, citizenId, dateOfBirth: dateOfBirthRaw, unitName, knownUnitNames: new Set(unitByName.keys()) });
        if (usesNewTeamColumn && unitName) {
          const genericTeamErrorIndex = validation.errors.findIndex(error => error.startsWith("Không tìm thấy Tổ "));
          if (genericTeamErrorIndex >= 0) validation.errors.splice(genericTeamErrorIndex, 1);
        }
        if (usesNewTeamColumn && !unitName) {
          const missingTeamErrorIndex = validation.errors.indexOf("Thiếu Tổ");
          if (missingTeamErrorIndex >= 0) validation.errors[missingTeamErrorIndex] = "Thiếu Tổ; hãy chọn Tên Tổ từ dropdown sau khi chọn Xã/phường";
        }
        let selectedTeam = unitName ? unitByName.get(unitName.toLocaleLowerCase("vi")) : undefined;
        if (usesNewTeamColumn && wardName && unitName) {
          const ward = wardByName.get(wardName.toLocaleLowerCase("vi"));
          if (!ward) validation.errors.push(`Không tìm thấy Xã/phường “${wardName}” trong danh mục`);
          else {
            const mappedTeamId = mappingBySource.get(`${normalizedCatalogText(wardName)}|${normalizedCatalogText(unitName)}`);
            selectedTeam = mappedTeamId ? teamById.get(mappedTeamId) : teamByWardAndName.get(`${ward.id}|${unitName.toLocaleLowerCase("vi")}`);
            if (mappedTeamId && selectedTeam?.parentId !== ward.id) validation.errors.push(`Ánh xạ Tổ cho “${unitName}” không thuộc Xã/phường “${wardName}”`);
            else if (!selectedTeam) {
              const baseName = normalizedTeamBase(unitName);
              const suggestions = availableUnits.filter(team => team.parentId === ward.id && (team.name.trim().toLocaleLowerCase("vi").startsWith(baseName) || baseName.startsWith(normalizedTeamBase(team.name)))).map(team => `“${team.name}”`).slice(0, 3);
              const suggestionText = suggestions.length ? ` Tổ gần khớp tại Xã/phường này: ${suggestions.join(", ")}.` : "";
              validation.errors.push(`Không tìm thấy Tổ “${unitName}” thuộc Xã/phường “${wardName}”.${suggestionText} Hãy chọn lại từ dropdown`);
            }
          }
        }
        if (usesNewTeamColumn && !wardName) validation.errors.push("Thiếu Xã/phường");
        if (validation.errors.length) { errors.push({ row: index + 2, message: validation.errors.join("; ") }); return; }
        const unitId = selectedTeam!.id;
        validRows.push({ row: index + 2, record: {
          fullName: fullName!, dateOfBirth, citizenId, unitId,
          gender: cleanText(row.GioiTinh)?.toLocaleLowerCase("vi") === "nam" ? "male" : cleanText(row.GioiTinh)?.toLocaleLowerCase("vi") === "nữ" ? "female" : null,
          educationLevel: cleanText(row.TrinhDo), ethnicity: cleanText(row.DanToc), position: cleanText(row.ChucVu), policyResult: cleanText(row.KetQuaChinhSach), religion: cleanText(row.TonGiao), village: null, joinedFormerForceAt: parseExcelDate(row["NgayThamGiaCAXBCT,BVDP"]), joinedAt: parseExcelDate(row.NgayThamGiaLLTGBVANTT), leftFormerForceAt: parseExcelDate(row["NgayThoiCAXBCT,BVDP"]), leftAt: parseExcelDate(row.NgayThoiThamGiaLLTGBVANTT), phone: cleanText(row.Sodienthoai), certificateNumber: cleanText(row.SoGCNsudungCCHT), notes: cleanText(row.Ghichu), commendation: cleanText(row.Khenthuong), classification: normalizeClassification(row.MucXeploai), classificationDecision: cleanText(row.Qdxeploai), address: cleanText(row.DiaChi) ?? cleanText(row["Thon/Todanpho"]),
        } });
      });
      if (errors.length) return { imported: 0, errors };
      let imported = 0;
      try {
        await db.createPersonnelBatch(validRows.map(item => ({ payload: item.record, status: derivePersonnelStatus(item.record.leftAt) })));
        imported = validRows.length;
      } catch {
        for (const item of validRows) {
          try {
            await db.createPersonnel(item.record, derivePersonnelStatus(item.record.leftAt));
            imported += 1;
          } catch (error) {
            errors.push({ row: item.row, message: describePersonnelInsertError(error) });
          }
        }
      }
      return { imported, errors };
    }),
  }),
});

export type AppRouter = typeof appRouter;
