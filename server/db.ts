import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { alias } from "drizzle-orm/mysql-core";
import {
  backupLogs,
  deletionRequestFiles,
  deletionRequests,
  editAccessRequests,
  InsertDeletionRequestFile,
  InsertPersonnel,
  InsertPersonnelCommendation,
  InsertPersonnelCommendationFile,
  InsertPersonnelFile,
  InsertPersonnelTraining,
  InsertPersonnelTrainingFile,
  InsertUnit,
  InsertUser,
  mobileSyncLogs,
  mobileSyncTokens,
  personnel,
  personnelCommendationFiles,
  personnelCommendations,
  personnelFiles,
  personnelTrainingFiles,
  personnelTrainings,
  units,
  users,
} from "../drizzle/schema";
import { buildTeamStaffingFromCounts } from "../shared/team-staffing";
import { buildForceBuildingStats, buildWardTreemap, type ActivePersonnelAnalyticsRow, type DashboardCatalogUnit } from "../shared/dashboard-analytics";
import { canCreateDeletionRequest, resolveDeletionRequest } from "../shared/deletion-requests";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getLocalUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function createLocalUser(input: { name: string; username: string; passwordHash: string; role: "leader" | "user"; assignedWardId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  // MySQL/TiDB TIMESTAMP does not accept the Unix epoch exactly (1970-01-01 00:00:00).
  // Store the account creation time until the first successful local sign-in updates it.
  const result = await db.insert(users).values({ openId: `local:${input.username}`, name: input.name, email: null, loginMethod: "local", username: input.username, passwordHash: input.passwordHash, mustChangePassword: true, passwordUpdatedAt: new Date(), role: input.role, assignedWardId: input.assignedWardId, lastSignedIn: new Date() });
  return Number(result[0].insertId);
}

export async function markLocalUserSignedIn(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(users).set({ lastSignedIn: new Date() }).where(and(eq(users.id, id), eq(users.loginMethod, "local")));
}

export async function resetLocalUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.update(users).set({ passwordHash, mustChangePassword: true, passwordUpdatedAt: new Date() }).where(and(eq(users.id, id), eq(users.loginMethod, "local")));
  if (Number(result[0]?.affectedRows ?? 0) !== 1) throw new Error("Không tìm thấy tài khoản nội bộ để cấp lại mật khẩu");
}

export async function completeLocalPasswordChange(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.update(users).set({ passwordHash, mustChangePassword: false, passwordUpdatedAt: new Date() }).where(and(eq(users.id, id), eq(users.loginMethod, "local")));
  if (Number(result[0]?.affectedRows ?? 0) !== 1) throw new Error("Không tìm thấy tài khoản nội bộ để đổi mật khẩu");
}

export type UnitPayload = Omit<InsertUnit, "id" | "createdAt" | "updatedAt">;
export type WardScope = number | null | undefined;

export async function listUnits(wardId?: WardScope) {
  const db = await getDb();
  if (!db) return [];
  const condition = wardId ? or(eq(units.id, wardId), eq(units.parentId, wardId)) : undefined;
  return db.select().from(units).where(condition).orderBy(asc(units.name));
}

export async function createUnit(payload: UnitPayload) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(units).values(payload);
  return Number(result[0].insertId);
}

export type UnitCatalogImportRow = { wardName: string; unitName: string | null; maxMembers: number };
type TransactionRunner = { transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> };
type ExistingCatalogUnit = { id: number; code: string; name: string; unitType: UnitPayload["unitType"]; parentId: number | null; maxMembers: number };
const UNIT_CATALOG_BATCH_SIZE = 250;

function nextCatalogUnitCode(prefix: string, occupiedCodes: Set<string>) {
  let serial = 1;
  let code = `${prefix}-${String(serial).padStart(4, "0")}`;
  while (occupiedCodes.has(code)) {
    serial += 1;
    code = `${prefix}-${String(serial).padStart(4, "0")}`;
  }
  occupiedCodes.add(code);
  return code;
}

function normalizedCatalogName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

/** Replaces the ward/team catalog as a single transaction while keeping referenced personnel safe. */
export async function importUnitCatalogWithExecutor(executor: TransactionRunner, rows: UnitCatalogImportRow[]) {
  return executor.transaction(async tx => {
    const existing = await tx.select({ id: units.id, code: units.code, name: units.name, unitType: units.unitType, parentId: units.parentId, maxMembers: units.maxMembers }).from(units) as ExistingCatalogUnit[];
    const wardIdByName = new Map(existing.filter(unit => unit.unitType === "ward").map(unit => [normalizedCatalogName(unit.name), unit.id]));
    const occupiedCodes = new Set(existing.map(unit => unit.code));
    const existingTeamByKey = new Map(existing.filter(unit => unit.unitType === "team" && unit.parentId).map(unit => [`${unit.parentId}|${normalizedCatalogName(unit.name)}`, unit]));
    const desiredWards = new Map<string, string>();
    rows.forEach(row => desiredWards.set(normalizedCatalogName(row.wardName), row.wardName));
    const desiredTeamsByWardAndName = new Map<string, UnitCatalogImportRow>();
    rows.forEach(row => {
      if (row.unitName) desiredTeamsByWardAndName.set(`${normalizedCatalogName(row.wardName)}|${normalizedCatalogName(row.unitName)}`, row);
    });

    const obsoleteTeams = existing.filter(unit => unit.unitType === "team" && (!unit.parentId || !desiredTeamsByWardAndName.has(`${normalizedCatalogName(existing.find(parent => parent.id === unit.parentId)?.name ?? "")}|${normalizedCatalogName(unit.name)}`)));
    const obsoleteTeamIds = obsoleteTeams.map(unit => unit.id);
    if (obsoleteTeamIds.length) {
      const [linkedPersonnel] = await tx.select({ total: count() }).from(personnel).where(inArray(personnel.unitId, obsoleteTeamIds));
      const linkedTotal = Number(linkedPersonnel?.total ?? 0);
      if (linkedTotal > 0) throw new Error(`Không thể thay thế danh mục vì ${linkedTotal} hồ sơ nhân sự đang thuộc Tổ không có trong file Excel. Hãy chuyển hồ sơ sang Tổ có trong file trước khi nhập lại.`);
      await tx.delete(units).where(inArray(units.id, obsoleteTeamIds));
    }

    const obsoleteWards = existing.filter(unit => unit.unitType === "ward" && !desiredWards.has(normalizedCatalogName(unit.name)));
    if (obsoleteWards.length) await tx.delete(units).where(inArray(units.id, obsoleteWards.map(unit => unit.id)));
    const newWards: Array<{ code: string; name: string; unitType: "ward"; parentId: null; maxMembers: number; address: null; isActive: "active" }> = [];
    desiredWards.forEach((name, key) => {
      if (!wardIdByName.has(key)) newWards.push({ code: nextCatalogUnitCode("XP", occupiedCodes), name, unitType: "ward", parentId: null, maxMembers: 0, address: null, isActive: "active" });
    });
    for (let start = 0; start < newWards.length; start += UNIT_CATALOG_BATCH_SIZE) {
      await tx.insert(units).values(newWards.slice(start, start + UNIT_CATALOG_BATCH_SIZE));
    }
    if (newWards.length) {
      const refreshedUnits = await tx.select({ id: units.id, name: units.name, unitType: units.unitType }).from(units) as Array<{ id: number; name: string; unitType: UnitPayload["unitType"] }>;
      refreshedUnits.filter(unit => unit.unitType === "ward").forEach(unit => wardIdByName.set(normalizedCatalogName(unit.name), unit.id));
    }

    const newTeams: Array<{ code: string; name: string; unitType: "team"; parentId: number; maxMembers: number; address: null; isActive: "active" }> = [];
    for (const row of Array.from(desiredTeamsByWardAndName.values())) {
      if (!row.unitName) continue;
      const wardId = wardIdByName.get(normalizedCatalogName(row.wardName));
      if (!wardId) throw new Error(`Không thể xác định xã/phường cho Tổ ${row.unitName}`);
      const teamKey = `${wardId}|${normalizedCatalogName(row.unitName)}`;
      const matchingTeam = existingTeamByKey.get(teamKey);
      if (matchingTeam) {
        if (matchingTeam.maxMembers !== row.maxMembers) await tx.update(units).set({ maxMembers: row.maxMembers, isActive: "active" }).where(eq(units.id, matchingTeam.id));
        continue;
      }
      newTeams.push({ code: nextCatalogUnitCode("TO", occupiedCodes), name: row.unitName, unitType: "team", parentId: wardId, maxMembers: row.maxMembers, address: null, isActive: "active" });
    }
    for (let start = 0; start < newTeams.length; start += UNIT_CATALOG_BATCH_SIZE) await tx.insert(units).values(newTeams.slice(start, start + UNIT_CATALOG_BATCH_SIZE));
    return { totalWards: desiredWards.size, totalTeams: desiredTeamsByWardAndName.size, removedWards: obsoleteWards.length, removedUnits: obsoleteTeams.length };
  });
}

export async function importUnitCatalog(rows: UnitCatalogImportRow[]) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  return importUnitCatalogWithExecutor(db, rows);
}

export async function getTeamStaffingWithExecutor(executor: { select: (...args: any[]) => any }) {
  const [allUnits, memberCounts] = await Promise.all([
    executor.select().from(units).orderBy(asc(units.name)),
    executor.select({ unitId: personnel.unitId, currentMembers: sql<number>`sum(case when ${personnel.status} = 'active' then 1 else 0 end)` }).from(personnel).groupBy(personnel.unitId),
  ]) as [Array<{ id: number; name: string; unitType: string; parentId: number | null; maxMembers: number }>, Array<{ unitId: number | null; currentMembers: number | null }>];
  const memberCountByUnit = new Map<number, number>(memberCounts.filter(item => item.unitId !== null).map(item => [item.unitId!, Number(item.currentMembers ?? 0)]));
  return buildTeamStaffingFromCounts(allUnits, memberCountByUnit);
}

export async function getTeamStaffing(wardId?: WardScope) {
  const db = await getDb();
  if (!db) return [];
  if (wardId) {
    const [allUnits, memberCounts] = await Promise.all([
      db.select().from(units).where(or(eq(units.id, wardId), eq(units.parentId, wardId))).orderBy(asc(units.name)),
      db.select({ unitId: personnel.unitId, currentMembers: sql<number>`sum(case when ${personnel.status} = 'active' then 1 else 0 end)` }).from(personnel).innerJoin(units, eq(personnel.unitId, units.id)).where(eq(units.parentId, wardId)).groupBy(personnel.unitId),
    ]);
    const memberCountByUnit = new Map(memberCounts.filter(item => item.unitId !== null).map(item => [item.unitId!, Number(item.currentMembers ?? 0)]));
    return buildTeamStaffingFromCounts(allUnits, memberCountByUnit);
  }
  return getTeamStaffingWithExecutor(db);
}

export async function updateUnit(id: number, payload: UnitPayload) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(units).set(payload).where(eq(units.id, id));
}

export async function removeUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const linked = await db.select({ total: count() }).from(personnel).where(eq(personnel.unitId, id));
  if ((linked[0]?.total ?? 0) > 0) throw new Error("Không thể xóa đơn vị đang có hồ sơ nhân sự");
  await db.delete(units).where(eq(units.id, id));
}

export type PersonnelFilters = {
  keyword?: string;
  unitId?: number;
  position?: string;
  status?: "active" | "inactive";
};

function personnelConditions(filters: PersonnelFilters) {
  const conditions = [];
  if (filters.keyword?.trim()) {
    const search = `%${filters.keyword.trim()}%`;
    conditions.push(or(like(personnel.fullName, search), like(personnel.citizenId, search), like(personnel.phone, search)));
  }
  if (filters.unitId) conditions.push(eq(personnel.unitId, filters.unitId));
  if (filters.position?.trim()) conditions.push(like(personnel.position, `%${filters.position.trim()}%`));
  if (filters.status) conditions.push(eq(personnel.status, filters.status));
  return conditions.length ? and(...conditions) : undefined;
}

export async function listPersonnel(filters: PersonnelFilters = {}, wardIds?: number[] | null) {
  const db = await getDb();
  if (!db) return [];
  const condition = wardIds?.length ? and(personnelConditions(filters), inArray(units.parentId, wardIds)) : personnelConditions(filters);
  return db
    .select({
      id: personnel.id,
      fullName: personnel.fullName,
      dateOfBirth: personnel.dateOfBirth,
      gender: personnel.gender,
      citizenId: personnel.citizenId,
      phone: personnel.phone,
      address: personnel.address,
      village: personnel.village,
      ethnicity: personnel.ethnicity,
      religion: personnel.religion,
      educationLevel: personnel.educationLevel,
      position: personnel.position,
      unitId: personnel.unitId,
      joinedFormerForceAt: personnel.joinedFormerForceAt,
      joinedAt: personnel.joinedAt,
      leftFormerForceAt: personnel.leftFormerForceAt,
      leftAt: personnel.leftAt,
      status: personnel.status,
      policyResult: personnel.policyResult,
      certificateNumber: personnel.certificateNumber,
      commendation: personnel.commendation,
      classification: personnel.classification,
      classificationDecision: personnel.classificationDecision,
      notes: personnel.notes,
      createdAt: personnel.createdAt,
      updatedAt: personnel.updatedAt,
      unitName: units.name,
    })
    .from(personnel)
    .leftJoin(units, eq(personnel.unitId, units.id))
    .where(condition)
    .orderBy(desc(personnel.updatedAt), asc(personnel.fullName));
}

export type MobileSyncCursor = { updatedAt: Date; id: number };

export async function listPersonnelForMobileSync(input: { updatedSince: Date | null; cursor: MobileSyncCursor | null; limit: number }) {
  const db = await getDb();
  if (!db) return { data: [], nextCursor: null as MobileSyncCursor | null };
  const ward = alias(units, "mobile_sync_ward");
  const updatedSinceCondition = input.updatedSince ? gt(personnel.updatedAt, input.updatedSince) : undefined;
  const cursorCondition = input.cursor ? or(gt(personnel.updatedAt, input.cursor.updatedAt), and(eq(personnel.updatedAt, input.cursor.updatedAt), gt(personnel.id, input.cursor.id))) : undefined;
  const rows = await db
    .select({ personnel, teamName: units.name, wardId: ward.id, wardName: ward.name })
    .from(personnel)
    .leftJoin(units, eq(personnel.unitId, units.id))
    .leftJoin(ward, eq(units.parentId, ward.id))
    .where(and(updatedSinceCondition, cursorCondition))
    .orderBy(asc(personnel.updatedAt), asc(personnel.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  const last = page.at(-1)?.personnel;
  return {
    data: page.map(row => ({ ...row.personnel, teamName: row.teamName ?? null, wardId: row.wardId ?? null, wardName: row.wardName ?? null })),
    nextCursor: hasMore && last ? { updatedAt: last.updatedAt, id: last.id } : null,
  };
}

export function hashMobileSyncToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMobileSyncToken(input: { label: string; wardId: number | null; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const token = `ms_${randomBytes(32).toString("base64url")}`;
  const result = await db.insert(mobileSyncTokens).values({ label: input.label, wardId: input.wardId, createdByUserId: input.createdByUserId, tokenHash: hashMobileSyncToken(token) });
  return { id: Number(result[0].insertId), token };
}

export async function findActiveMobileSyncToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(mobileSyncTokens).where(and(eq(mobileSyncTokens.tokenHash, hashMobileSyncToken(token)), sql`${mobileSyncTokens.revokedAt} IS NULL`)).limit(1);
  return rows[0] ?? null;
}

export async function touchMobileSyncToken(id: number) {
  const db = await getDb();
  if (db) await db.update(mobileSyncTokens).set({ lastUsedAt: new Date() }).where(eq(mobileSyncTokens.id, id));
}

export async function revokeMobileSyncToken(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(mobileSyncTokens).set({ revokedAt: new Date() }).where(eq(mobileSyncTokens.id, id));
}

export async function listMobileSyncTokens() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: mobileSyncTokens.id, label: mobileSyncTokens.label, wardId: mobileSyncTokens.wardId, createdByUserId: mobileSyncTokens.createdByUserId, createdAt: mobileSyncTokens.createdAt, lastUsedAt: mobileSyncTokens.lastUsedAt, revokedAt: mobileSyncTokens.revokedAt }).from(mobileSyncTokens).orderBy(desc(mobileSyncTokens.createdAt));
}

export async function createMobileSyncLog(input: { tokenId: number; wardId: number | null; statusCode: number; unitCount: number; personnelCount: number; errorCode?: string | null; ipAddress?: string | null; userAgent?: string | null }) {
  const db = await getDb();
  if (db) await db.insert(mobileSyncLogs).values({ ...input, errorCode: input.errorCode ?? null, ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null });
}

export async function listMobileSyncLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: mobileSyncLogs.id, tokenId: mobileSyncLogs.tokenId, tokenLabel: mobileSyncTokens.label, wardId: mobileSyncLogs.wardId, statusCode: mobileSyncLogs.statusCode, unitCount: mobileSyncLogs.unitCount, personnelCount: mobileSyncLogs.personnelCount, errorCode: mobileSyncLogs.errorCode, ipAddress: mobileSyncLogs.ipAddress, userAgent: mobileSyncLogs.userAgent, createdAt: mobileSyncLogs.createdAt }).from(mobileSyncLogs).innerJoin(mobileSyncTokens, eq(mobileSyncLogs.tokenId, mobileSyncTokens.id)).orderBy(desc(mobileSyncLogs.createdAt)).limit(Math.min(Math.max(limit, 1), 200));
}

export async function getMobileSyncSnapshot(wardId: number | null) {
  const [snapshotUnits, snapshotPersonnel] = await Promise.all([listUnits(wardId ?? undefined), listPersonnel({}, wardId ? [wardId] : null)]);
  return {
    units: snapshotUnits.filter(unit => unit.unitType === "ward" || unit.unitType === "team").map(unit => ({ id: unit.id, name: unit.name, type: unit.unitType, parentId: unit.parentId, capacity: unit.maxMembers })),
    personnel: snapshotPersonnel.map(row => ({ id: row.id, fullName: row.fullName, unitId: row.unitId, dateOfBirth: row.dateOfBirth, gender: row.gender, citizenId: row.citizenId, phone: row.phone, address: row.address, village: row.village, ethnicity: row.ethnicity, religion: row.religion, educationLevel: row.educationLevel, position: row.position, joinedFormerForceAt: row.joinedFormerForceAt, joinedAt: row.joinedAt, leftFormerForceAt: row.leftFormerForceAt, leftAt: row.leftAt, policyResult: row.policyResult, certificateNumber: row.certificateNumber, commendation: row.commendation, classification: row.classification, classificationDecision: row.classificationDecision, notes: row.notes })),
  };
}

export async function getPersonnelDetail(id: number, wardId?: WardScope) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ personnel, unitName: units.name })
    .from(personnel)
    .leftJoin(units, eq(personnel.unitId, units.id))
    .where(wardId ? and(eq(personnel.id, id), eq(units.parentId, wardId)) : eq(personnel.id, id))
    .limit(1);
  if (!result[0]) return undefined;
  const files = await db.select().from(personnelFiles).where(eq(personnelFiles.personnelId, id)).orderBy(desc(personnelFiles.createdAt));
  const [commendations, trainings] = await Promise.all([
    db.select().from(personnelCommendations).where(eq(personnelCommendations.personnelId, id)).orderBy(desc(personnelCommendations.issuedAt), desc(personnelCommendations.createdAt)),
    db.select().from(personnelTrainings).where(eq(personnelTrainings.personnelId, id)).orderBy(desc(personnelTrainings.issuedAt), desc(personnelTrainings.createdAt)),
  ]);
  const [commendationFiles, trainingFiles] = await Promise.all([
    commendations.length ? db.select().from(personnelCommendationFiles).where(inArray(personnelCommendationFiles.commendationId, commendations.map(item => item.id))).orderBy(desc(personnelCommendationFiles.createdAt)) : [],
    trainings.length ? db.select().from(personnelTrainingFiles).where(inArray(personnelTrainingFiles.trainingId, trainings.map(item => item.id))).orderBy(desc(personnelTrainingFiles.createdAt)) : [],
  ]);
  const commendationFilesById = new Map<number, typeof commendationFiles>();
  commendationFiles.forEach(file => commendationFilesById.set(file.commendationId, [...(commendationFilesById.get(file.commendationId) ?? []), file]));
  const trainingFilesById = new Map<number, typeof trainingFiles>();
  trainingFiles.forEach(file => trainingFilesById.set(file.trainingId, [...(trainingFilesById.get(file.trainingId) ?? []), file]));
  return { ...result[0], files, commendations: commendations.map(item => ({ ...item, files: commendationFilesById.get(item.id) ?? [] })), trainings: trainings.map(item => ({ ...item, files: trainingFilesById.get(item.id) ?? [] })) };
}

export type PersonnelPayload = Omit<InsertPersonnel, "id" | "createdAt" | "updatedAt" | "status">;

export async function createPersonnel(payload: PersonnelPayload, status: "active" | "inactive") {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(personnel).values({ ...payload, status });
  return Number(result[0].insertId);
}

export async function createPersonnelBatch(records: Array<{ payload: PersonnelPayload; status: "active" | "inactive" }>) {
  const database = await getDb();
  if (!database) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const batchSize = 250;
  await database.transaction(async tx => {
    for (let start = 0; start < records.length; start += batchSize) {
      await tx.insert(personnel).values(records.slice(start, start + batchSize).map(record => ({ ...record.payload, status: record.status })));
    }
  });
}

export async function updatePersonnel(id: number, payload: PersonnelPayload, status: "active" | "inactive") {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(personnel).set({ ...payload, status }).where(eq(personnel.id, id));
}

export async function teamBelongsToWard(teamId: number, wardId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: units.id }).from(units).where(and(eq(units.id, teamId), eq(units.unitType, "team"), eq(units.parentId, wardId))).limit(1);
  return Boolean(result[0]);
}

export async function personnelBelongsToWard(personnelId: number, wardId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: personnel.id }).from(personnel).innerJoin(units, eq(personnel.unitId, units.id)).where(and(eq(personnel.id, personnelId), eq(units.parentId, wardId))).limit(1);
  return Boolean(result[0]);
}

export async function removePersonnel(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  if (ids.length) await db.delete(personnel).where(inArray(personnel.id, ids));
}

export async function createDeletionRequest(input: { personnelId: number; personnelName: string; reason: string; requesterUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const pending = await db.select({ total: count() }).from(deletionRequests).where(and(eq(deletionRequests.personnelId, input.personnelId), eq(deletionRequests.status, "pending")));
  if (!canCreateDeletionRequest(Array(Number(pending[0]?.total ?? 0)).fill("pending"))) throw new Error("Hồ sơ này đã có yêu cầu xóa đang chờ Admin xem xét");
  const result = await db.insert(deletionRequests).values(input);
  return Number(result[0].insertId);
}

export async function listDeletionRequests(requesterUserId?: number) {
  const db = await getDb();
  if (!db) return [];
  const requester = alias(users, "deletion_requester");
  const reviewer = alias(users, "deletion_reviewer");
  const condition = requesterUserId ? eq(deletionRequests.requesterUserId, requesterUserId) : undefined;
  const rows = await db.select({ id: deletionRequests.id, personnelId: deletionRequests.personnelId, personnelName: deletionRequests.personnelName, reason: deletionRequests.reason, status: deletionRequests.status, requesterUserId: deletionRequests.requesterUserId, requesterName: requester.name, reviewerUserId: deletionRequests.reviewerUserId, reviewerName: reviewer.name, decisionNote: deletionRequests.decisionNote, createdAt: deletionRequests.createdAt, reviewedAt: deletionRequests.reviewedAt, executedAt: deletionRequests.executedAt }).from(deletionRequests).leftJoin(requester, eq(deletionRequests.requesterUserId, requester.id)).leftJoin(reviewer, eq(deletionRequests.reviewerUserId, reviewer.id)).where(condition).orderBy(asc(deletionRequests.status), desc(deletionRequests.createdAt));
  if (!rows.length) return [];
  const files = await db.select().from(deletionRequestFiles).where(inArray(deletionRequestFiles.deletionRequestId, rows.map(row => row.id))).orderBy(desc(deletionRequestFiles.createdAt));
  const filesByRequest = new Map<number, typeof files>();
  files.forEach(file => filesByRequest.set(file.deletionRequestId, [...(filesByRequest.get(file.deletionRequestId) ?? []), file]));
  return rows.map(row => ({ ...row, files: filesByRequest.get(row.id) ?? [] }));
}

export async function getDeletionRequestForRequester(id: number, requesterUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: deletionRequests.id, status: deletionRequests.status, requesterUserId: deletionRequests.requesterUserId }).from(deletionRequests).where(and(eq(deletionRequests.id, id), eq(deletionRequests.requesterUserId, requesterUserId))).limit(1);
  return result[0];
}

export async function addDeletionRequestFile(payload: Omit<InsertDeletionRequestFile, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(deletionRequestFiles).values(payload);
  return Number(result[0].insertId);
}

export async function rejectDeletionRequest(id: number, reviewerUserId: number, decisionNote: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.update(deletionRequests).set({ status: resolveDeletionRequest("pending", "reject"), reviewerUserId, decisionNote, reviewedAt: new Date() }).where(and(eq(deletionRequests.id, id), eq(deletionRequests.status, "pending")));
  if (Number(result[0]?.affectedRows ?? 0) !== 1) throw new Error("Yêu cầu không còn ở trạng thái chờ xử lý");
}

export async function executeDeletionRequest(id: number, reviewerUserId: number, decisionNote: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  return db.transaction(async tx => {
    const requests = await tx.select({ personnelId: deletionRequests.personnelId }).from(deletionRequests).where(and(eq(deletionRequests.id, id), eq(deletionRequests.status, "pending"))).limit(1);
    const request = requests[0];
    if (!request) throw new Error("Yêu cầu không còn ở trạng thái chờ xử lý");
    if (request.personnelId) await tx.delete(personnel).where(eq(personnel.id, request.personnelId));
    await tx.update(deletionRequests).set({ status: resolveDeletionRequest("pending", "execute"), reviewerUserId, decisionNote, reviewedAt: new Date(), executedAt: new Date(), personnelId: null }).where(eq(deletionRequests.id, id));
    return { personnelDeleted: Boolean(request.personnelId) };
  });
}

export async function transferPersonnelUnit(fromUnitId: number, toUnitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  if (fromUnitId === toUnitId) throw new Error("Đơn vị nguồn và đơn vị đích phải khác nhau");
  const result = await db.update(personnel).set({ unitId: toUnitId }).where(eq(personnel.unitId, fromUnitId));
  return Number(result[0].affectedRows ?? 0);
}

export async function addPersonnelFile(payload: Omit<InsertPersonnelFile, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(personnelFiles).values(payload);
  return Number(result[0].insertId);
}

export async function removePersonnelFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.delete(personnelFiles).where(eq(personnelFiles.id, id));
}

export type PersonnelCommendationPayload = Omit<InsertPersonnelCommendation, "id" | "personnelId" | "createdAt" | "updatedAt">;
export type PersonnelTrainingPayload = Omit<InsertPersonnelTraining, "id" | "personnelId" | "createdAt" | "updatedAt">;

export async function createPersonnelCommendation(personnelId: number, payload: PersonnelCommendationPayload) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(personnelCommendations).values({ personnelId, ...payload });
  return Number(result[0].insertId);
}

export async function updatePersonnelCommendation(id: number, payload: PersonnelCommendationPayload) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(personnelCommendations).set(payload).where(eq(personnelCommendations.id, id));
}

export async function removePersonnelCommendation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.delete(personnelCommendations).where(eq(personnelCommendations.id, id));
}

export async function getPersonnelCommendation(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: personnelCommendations.id, personnelId: personnelCommendations.personnelId }).from(personnelCommendations).where(eq(personnelCommendations.id, id)).limit(1);
  return result[0];
}

export async function addPersonnelCommendationFile(payload: Omit<InsertPersonnelCommendationFile, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(personnelCommendationFiles).values(payload);
  return Number(result[0].insertId);
}

export async function removePersonnelCommendationFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.delete(personnelCommendationFiles).where(eq(personnelCommendationFiles.id, id));
}

export async function getPersonnelCommendationFile(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: personnelCommendationFiles.id, personnelId: personnelCommendations.personnelId }).from(personnelCommendationFiles).innerJoin(personnelCommendations, eq(personnelCommendationFiles.commendationId, personnelCommendations.id)).where(eq(personnelCommendationFiles.id, id)).limit(1);
  return result[0];
}

export async function createPersonnelTraining(personnelId: number, payload: PersonnelTrainingPayload) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(personnelTrainings).values({ personnelId, ...payload });
  return Number(result[0].insertId);
}

export async function updatePersonnelTraining(id: number, payload: PersonnelTrainingPayload) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(personnelTrainings).set(payload).where(eq(personnelTrainings.id, id));
}

export async function removePersonnelTraining(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.delete(personnelTrainings).where(eq(personnelTrainings.id, id));
}

export async function getPersonnelTraining(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: personnelTrainings.id, personnelId: personnelTrainings.personnelId }).from(personnelTrainings).where(eq(personnelTrainings.id, id)).limit(1);
  return result[0];
}

export async function addPersonnelTrainingFile(payload: Omit<InsertPersonnelTrainingFile, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(personnelTrainingFiles).values(payload);
  return Number(result[0].insertId);
}

export async function removePersonnelTrainingFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.delete(personnelTrainingFiles).where(eq(personnelTrainingFiles.id, id));
}

export async function getPersonnelTrainingFile(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: personnelTrainingFiles.id, personnelId: personnelTrainings.personnelId }).from(personnelTrainingFiles).innerJoin(personnelTrainings, eq(personnelTrainingFiles.trainingId, personnelTrainings.id)).where(eq(personnelTrainingFiles.id, id)).limit(1);
  return result[0];
}

export async function listBm1Activities(wardIds: number[]) {
  const db = await getDb();
  if (!db || !wardIds.length) return { commendations: [], trainings: [] };
  const wardCondition = inArray(units.parentId, wardIds);
  const [commendations, trainings] = await Promise.all([
    db.select({ wardId: units.parentId, awardType: personnelCommendations.awardType, issuedAt: personnelCommendations.issuedAt }).from(personnelCommendations).innerJoin(personnel, eq(personnelCommendations.personnelId, personnel.id)).innerJoin(units, eq(personnel.unitId, units.id)).where(wardCondition),
    db.select({ wardId: units.parentId, issuedAt: personnelTrainings.issuedAt }).from(personnelTrainings).innerJoin(personnel, eq(personnelTrainings.personnelId, personnel.id)).innerJoin(units, eq(personnel.unitId, units.id)).where(wardCondition),
  ]);
  return { commendations: commendations.filter(item => item.wardId !== null).map(item => ({ wardId: item.wardId!, awardType: item.awardType, issuedAt: item.issuedAt })), trainings: trainings.filter(item => item.wardId !== null).map(item => ({ wardId: item.wardId!, issuedAt: item.issuedAt })) };
}

export async function getDashboardStatsWithExecutor(executor: { select: (...args: any[]) => any }) {
  const [summaryRows, unitTypeCounts, catalogUnits, activePersonnelRows] = await Promise.all([
    executor
    .select({
      total: count(),
      active: sql<number>`sum(case when ${personnel.status} = 'active' then 1 else 0 end)`,
      inactive: sql<number>`sum(case when ${personnel.status} = 'inactive' then 1 else 0 end)`,
    })
    .from(personnel),
    executor.select({ unitType: units.unitType, total: count() }).from(units).where(inArray(units.unitType, ["ward", "team"])).groupBy(units.unitType),
    executor.select({ id: units.id, name: units.name, unitType: units.unitType, parentId: units.parentId, maxMembers: units.maxMembers }).from(units).where(inArray(units.unitType, ["ward", "team"])),
    executor.select({ unitId: personnel.unitId, dateOfBirth: personnel.dateOfBirth, gender: personnel.gender, position: personnel.position, educationLevel: personnel.educationLevel }).from(personnel).where(eq(personnel.status, "active")),
  ]) as [
    Array<{ total: number; active: number | null; inactive: number | null }>,
    Array<{ unitType: UnitPayload["unitType"]; total: number }>,
    DashboardCatalogUnit[],
    ActivePersonnelAnalyticsRow[],
  ];
  const summary = summaryRows[0];
  const unitCountByType = new Map(unitTypeCounts.map(item => [item.unitType, Number(item.total)]));
  return {
    total: Number(summary?.total ?? 0),
    active: Number(summary?.active ?? 0),
    inactive: Number(summary?.inactive ?? 0),
    totalWards: unitCountByType.get("ward") ?? 0,
    totalTeams: unitCountByType.get("team") ?? 0,
    wardTreemap: buildWardTreemap(catalogUnits, activePersonnelRows),
    forceBuilding: buildForceBuildingStats(activePersonnelRows),
    byStatus: [
      { name: "Đang tham gia", value: Number(summary?.active ?? 0), color: "#0B3B70" },
      { name: "Thôi tham gia", value: Number(summary?.inactive ?? 0), color: "#B91C32" },
    ],
  };
}

export async function getDashboardStats(wardId?: WardScope) {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, inactive: 0, totalWards: 0, totalTeams: 0, wardTreemap: [], forceBuilding: buildForceBuildingStats([]), byStatus: [] };
  if (wardId) {
    const [summaryRows, catalogUnits, activePersonnelRows] = await Promise.all([
      db.select({ total: count(), active: sql<number>`sum(case when ${personnel.status} = 'active' then 1 else 0 end)`, inactive: sql<number>`sum(case when ${personnel.status} = 'inactive' then 1 else 0 end)` }).from(personnel).innerJoin(units, eq(personnel.unitId, units.id)).where(eq(units.parentId, wardId)),
      db.select({ id: units.id, name: units.name, unitType: units.unitType, parentId: units.parentId, maxMembers: units.maxMembers }).from(units).where(or(eq(units.id, wardId), eq(units.parentId, wardId))),
      db.select({ unitId: personnel.unitId, dateOfBirth: personnel.dateOfBirth, gender: personnel.gender, position: personnel.position, educationLevel: personnel.educationLevel }).from(personnel).innerJoin(units, eq(personnel.unitId, units.id)).where(and(eq(personnel.status, "active"), eq(units.parentId, wardId))),
    ]) as [Array<{ total: number; active: number | null; inactive: number | null }>, DashboardCatalogUnit[], ActivePersonnelAnalyticsRow[]];
    const summary = summaryRows[0];
    return {
      total: Number(summary?.total ?? 0), active: Number(summary?.active ?? 0), inactive: Number(summary?.inactive ?? 0),
      totalWards: catalogUnits.filter(unit => unit.unitType === "ward").length, totalTeams: catalogUnits.filter(unit => unit.unitType === "team").length,
      wardTreemap: buildWardTreemap(catalogUnits, activePersonnelRows), forceBuilding: buildForceBuildingStats(activePersonnelRows),
      byStatus: [{ name: "Đang tham gia", value: Number(summary?.active ?? 0), color: "#0B3B70" }, { name: "Thôi tham gia", value: Number(summary?.inactive ?? 0), color: "#B91C32" }],
    };
  }
  return getDashboardStatsWithExecutor(db);
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, loginMethod: users.loginMethod, username: users.username, role: users.role, assignedWardId: users.assignedWardId, assignedWardName: units.name, canEditPersonnel: users.canEditPersonnel, mustChangePassword: users.mustChangePassword, adminPermissions: users.adminPermissions, lastSignedIn: users.lastSignedIn }).from(users).leftJoin(units, eq(users.assignedWardId, units.id)).orderBy(asc(users.name));
}

export async function updateUserAccess(id: number, role: "admin" | "leader" | "user", assignedWardId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(users).set({ role, assignedWardId: role === "user" ? assignedWardId : null }).where(eq(users.id, id));
}

export async function setUserPersonnelEditPermission(id: number, canEditPersonnel: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.update(users).set({ canEditPersonnel }).where(and(eq(users.id, id), eq(users.role, "user")));
}

export async function updateLeaderDelegatedPermissions(id: number, permissions: string) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.update(users).set({ adminPermissions: permissions }).where(and(eq(users.id, id), eq(users.role, "leader")));
  if (Number(result[0]?.affectedRows ?? 0) !== 1) throw new Error("Không tìm thấy tài khoản Lãnh đạo để cập nhật quyền");
}

export async function getMyEditAccessRequest(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(editAccessRequests).where(eq(editAccessRequests.requesterUserId, userId)).orderBy(desc(editAccessRequests.createdAt)).limit(1);
  return result[0];
}

export async function createEditAccessRequest(input: { requesterUserId: number; wardId: number; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const pending = await db.select({ id: editAccessRequests.id }).from(editAccessRequests).where(and(eq(editAccessRequests.requesterUserId, input.requesterUserId), eq(editAccessRequests.status, "pending"))).limit(1);
  if (pending[0]) throw new Error("Đã có yêu cầu mở quyền chỉnh sửa đang chờ Admin xử lý");
  const result = await db.insert(editAccessRequests).values(input);
  return Number(result[0].insertId);
}

export async function listEditAccessRequests(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  const reviewer = alias(users, "edit_access_reviewer");
  const query = db.select({ id: editAccessRequests.id, requesterUserId: editAccessRequests.requesterUserId, requesterName: users.name, wardId: editAccessRequests.wardId, wardName: units.name, reason: editAccessRequests.reason, status: editAccessRequests.status, reviewerUserId: editAccessRequests.reviewerUserId, reviewerName: reviewer.name, decisionNote: editAccessRequests.decisionNote, createdAt: editAccessRequests.createdAt, reviewedAt: editAccessRequests.reviewedAt }).from(editAccessRequests).innerJoin(users, eq(editAccessRequests.requesterUserId, users.id)).innerJoin(units, eq(editAccessRequests.wardId, units.id)).leftJoin(reviewer, eq(editAccessRequests.reviewerUserId, reviewer.id));
  return status ? query.where(eq(editAccessRequests.status, status)).orderBy(desc(editAccessRequests.createdAt)) : query.orderBy(desc(editAccessRequests.createdAt));
}

export async function reviewEditAccessRequest(input: { id: number; reviewerUserId: number; approve: boolean; decisionNote?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  await db.transaction(async tx => {
    const request = await tx.select().from(editAccessRequests).where(and(eq(editAccessRequests.id, input.id), eq(editAccessRequests.status, "pending"))).limit(1);
    if (!request[0]) throw new Error("Yêu cầu không tồn tại hoặc đã được xử lý");
    await tx.update(editAccessRequests).set({ status: input.approve ? "approved" : "rejected", reviewerUserId: input.reviewerUserId, decisionNote: input.decisionNote ?? null, reviewedAt: new Date() }).where(eq(editAccessRequests.id, input.id));
    if (input.approve) await tx.update(users).set({ canEditPersonnel: true }).where(and(eq(users.id, request[0].requesterUserId), eq(users.role, "user")));
  });
}

export async function listBackupLogs() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: backupLogs.id,
      actionType: backupLogs.actionType,
      status: backupLogs.status,
      fileName: backupLogs.fileName,
      notes: backupLogs.notes,
      actorUserId: backupLogs.actorUserId,
      createdAt: backupLogs.createdAt,
      actorName: users.name,
    })
    .from(backupLogs)
    .leftJoin(users, eq(backupLogs.actorUserId, users.id))
    .orderBy(desc(backupLogs.createdAt));
}

export async function createBackupLog(input: {
  actionType: "backup" | "restore" | "import" | "export";
  status: "success" | "failed";
  fileName?: string | null;
  storageKey?: string | null;
  notes?: string | null;
  actorUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu");
  const result = await db.insert(backupLogs).values(input);
  return Number(result[0].insertId);
}
