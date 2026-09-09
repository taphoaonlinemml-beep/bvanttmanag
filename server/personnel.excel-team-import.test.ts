import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { personnelExcelHeaders } from "../shared/excel";
import { buildTeamStaffing } from "../shared/team-staffing";

const listUnits = vi.hoisted(() => vi.fn());
const createPersonnel = vi.hoisted(() => vi.fn());
const createPersonnelBatch = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ listUnits, createPersonnel, createPersonnelBatch }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "excel-admin", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

function workbookBase64() {
  const row = Object.fromEntries(personnelExcelHeaders.map(header => [header, ""]));
  row.HoTen = "Nguyễn Văn A";
  row.NgaySinh = 45292;
  row["Xa/Phuong"] = "Tổ 1";
  const secondRow = { ...row, HoTen: "Nguyễn Văn B" };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([row, secondRow], { header: [...personnelExcelHeaders] }), "DanhSachNhanSu");
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
}

function workbookBase64WithWardAndTeam(wardName: string, teamName: string, citizenId = "") {
  const headers = [...personnelExcelHeaders];
  headers.splice(headers.indexOf("Xa/Phuong") + 1, 0, "TenTo" as any);
  const row = Object.fromEntries(headers.map(header => [header, ""]));
  row.HoTen = "Nguyễn Văn C";
  row.CCCD = citizenId;
  row["Xa/Phuong"] = wardName;
  row.TenTo = teamName;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([row], { header: headers }), "DanhSachNhanSu");
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
}

describe("excel.importPersonnel into team", () => {
  it("generates the updated template with separate ward and team columns", async () => {
    listUnits.mockResolvedValue([{ id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 }, { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 1 }]);
    const caller = appRouter.createCaller(adminContext());
    const template = await caller.excel.template();
    const workbook = XLSX.read(Buffer.from(template.base64, "base64"), { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    const headers = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })[0] ?? [];
    expect(headers).toEqual(expect.arrayContaining(["Xa/Phuong", "TenTo"]));
    const validationWorkbook = new ExcelJS.Workbook();
    await validationWorkbook.xlsx.load(Buffer.from(template.base64, "base64"));
    const validationSheet = validationWorkbook.getWorksheet("DanhSachNhanSu");
    expect(validationSheet?.getCell("I2").dataValidation).toMatchObject({ type: "custom", formulae: [expect.stringContaining("LEN($I2)=9")] });
    expect(validationSheet?.getCell("L2").dataValidation).toMatchObject({ type: "list", formulae: ["=Ward_List"] });
    expect(validationSheet?.getCell("M2").dataValidation).toMatchObject({ type: "list", formulae: [expect.stringContaining("=INDIRECT(VLOOKUP($L2,Ward_Team_Map,2,FALSE))")] });
  });

  it("imports a record into a valid team and contributes to configured team staffing", async () => {
    const created: Array<{ unitId: number; status: "active" | "inactive" }> = [];
    listUnits.mockResolvedValue([{ id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 }, { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 1 }]);
    createPersonnelBatch.mockImplementation(async records => { records.forEach((item: { payload: { unitId: number }; status: "active" | "inactive" }) => created.push({ unitId: item.payload.unitId, status: item.status })); });
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.excel.importPersonnel({ base64: workbookBase64() })).resolves.toEqual({ imported: 2, errors: [] });
    expect(buildTeamStaffing(await listUnits(), created)[0]).toMatchObject({ teamId: 2, currentMembers: 2, availableMembers: 0, isOverCapacity: true });
  });

  it("imports the new template only when the selected team belongs to the stated ward", async () => {
    listUnits.mockResolvedValue([{ id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 }, { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 1 }, { id: 3, name: "Phường Bình Minh", unitType: "ward", parentId: null, maxMembers: 0 }]);
    createPersonnel.mockResolvedValue(1);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.excel.importPersonnel({ base64: workbookBase64WithWardAndTeam("Phường An Bình", "Tổ 1") })).resolves.toEqual({ imported: 1, errors: [] });
    await expect(caller.excel.importPersonnel({ base64: workbookBase64WithWardAndTeam("Phường Bình Minh", "Tổ 1") })).resolves.toMatchObject({ imported: 0, errors: [{ row: 2, message: expect.stringContaining("Không tìm thấy Tổ") }] });
  });

  it("suggests matching teams in the selected ward and gives a clear error when a team is missing", async () => {
    listUnits.mockResolvedValue([
      { id: 1, name: "Xã An Hòa", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 2, name: "Thôn Xuân Phong Bắc", unitType: "team", parentId: 1, maxMembers: 0 },
      { id: 3, name: "Thôn Xuân Phong Nam", unitType: "team", parentId: 1, maxMembers: 0 },
    ]);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.excel.importPersonnel({ base64: workbookBase64WithWardAndTeam("Xã An Hòa", "Thôn Xuân Phong Tây") })).resolves.toMatchObject({ imported: 0, errors: [{ row: 2, message: expect.stringContaining("Thôn Xuân Phong Bắc") }] });
    await expect(caller.excel.importPersonnel({ base64: workbookBase64WithWardAndTeam("Xã An Hòa", "") })).resolves.toMatchObject({ imported: 0, errors: [{ row: 2, message: expect.stringContaining("Thiếu Tổ; hãy chọn Tên Tổ từ dropdown") }] });
  });

  it("groups a mismatched source team once and applies an approved mapping to all matching rows", async () => {
    const created: Array<{ unitId: number }> = [];
    listUnits.mockResolvedValue([
      { id: 1, name: "Xã An Hòa", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 2, name: "Thôn Xuân Phong Bắc", unitType: "team", parentId: 1, maxMembers: 0 },
      { id: 3, name: "Thôn Xuân Phong Nam", unitType: "team", parentId: 1, maxMembers: 0 },
    ]);
    createPersonnelBatch.mockImplementation(async records => { records.forEach((item: { payload: { unitId: number } }) => created.push({ unitId: item.payload.unitId })); });
    const caller = appRouter.createCaller(adminContext());
    const sourceFile = workbookBase64WithWardAndTeam("Xã An Hòa", "Thôn Xuân Phong Tây");
    await expect(caller.excel.analyzeTeamMappings({ base64: sourceFile })).resolves.toMatchObject({ totalRows: 1, groups: [{ wardName: "Xã An Hòa", sourceTeamName: "Thôn Xuân Phong Tây", rows: [2], candidates: expect.arrayContaining([{ id: 2, name: "Thôn Xuân Phong Bắc" }]) }] });
    await expect(caller.excel.importPersonnel({ base64: sourceFile, teamMappings: [{ wardName: "Xã An Hòa", sourceTeamName: "Thôn Xuân Phong Tây", teamId: 2 }] })).resolves.toEqual({ imported: 1, errors: [] });
    expect(created).toEqual([{ unitId: 2 }]);
  });

  it("resolves duplicate team names by the selected ward and normalizes a formatted citizen ID", async () => {
    const created: Array<{ unitId: number; citizenId: string | null | undefined }> = [];
    listUnits.mockResolvedValue([
      { id: 1, name: "Xã An Lão", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 2, name: "Thôn Tân Lập", unitType: "team", parentId: 1, maxMembers: 0 },
      { id: 3, name: "Xã Ia Hrung", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 4, name: "Thôn Tân Lập", unitType: "team", parentId: 3, maxMembers: 0 },
    ]);
    createPersonnelBatch.mockImplementation(async records => { records.forEach((item: { payload: { unitId: number; citizenId: string | null | undefined } }) => created.push({ unitId: item.payload.unitId, citizenId: item.payload.citizenId })); });
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.excel.importPersonnel({ base64: workbookBase64WithWardAndTeam("Xã An Lão", "Thôn Tân Lập", "0123-456-789 01") })).resolves.toEqual({ imported: 1, errors: [] });
    expect(created).toEqual([{ unitId: 2, citizenId: "012345678901" }]);
  });

  it("returns a row-level error instead of throwing when the database cannot save a valid row", async () => {
    listUnits.mockResolvedValue([{ id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 }, { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 1 }]);
    createPersonnelBatch.mockRejectedValue(new Error("Batch insert failed"));
    createPersonnel.mockRejectedValue(new Error("Data too long for column 'notes'"));
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.excel.importPersonnel({ base64: workbookBase64() })).resolves.toMatchObject({ imported: 0, errors: expect.arrayContaining([{ row: 2, message: "Có trường dữ liệu vượt quá độ dài cho phép; rút ngắn nội dung ở dòng này" }]) });
  });
});
