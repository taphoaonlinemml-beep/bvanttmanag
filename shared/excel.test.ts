import { describe, expect, it } from "vitest";
import { isParseableSpreadsheetDate, personnelExcelHeaders, unitCatalogExcelHeaders, validatePersonnelExcelHeaders, validatePersonnelImportRow, validateUnitCatalogExcelHeaders, validateUnitCatalogImportRow } from "./excel";

describe("personnel Excel conventions", () => {
  it("accepts the mandated template headers and reports missing columns", () => {
    expect(validatePersonnelExcelHeaders([...personnelExcelHeaders])).toEqual({ valid: true, missing: [] });
    const result = validatePersonnelExcelHeaders(["STT", "HoTen", "NgaySinh"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("CCCD");
    expect(result.missing).toContain("Xa/Phuong");
  });

  it("validates dates, CCCD, required names and mapped units before import", () => {
    expect(isParseableSpreadsheetDate("13/08/2026")).toBe(true);
    expect(isParseableSpreadsheetDate("ngày không hợp lệ")).toBe(false);
    const valid = validatePersonnelImportRow({ fullName: "Nguyễn Văn A", citizenId: "001234567890", dateOfBirth: "01/01/1970", unitName: "Phường An Bình", knownUnitNames: new Set(["phường an bình"]) });
    expect(valid).toEqual({ valid: true, errors: [] });
    const invalid = validatePersonnelImportRow({ fullName: null, citizenId: "123", dateOfBirth: "not-a-date", unitName: "Đơn vị không có", knownUnitNames: new Set(["phường an bình"]) });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual(expect.arrayContaining(["Thiếu Họ tên", "Ngày sinh không hợp lệ", "CCCD phải có 9 hoặc 12 chữ số", "Không tìm thấy Tổ “Đơn vị không có” trong danh mục"]));
    expect(validatePersonnelImportRow({ fullName: "Nguyễn Văn A", citizenId: null, dateOfBirth: null, unitName: null, knownUnitNames: new Set(["tổ 1"]) })).toEqual({ valid: false, errors: ["Thiếu Tổ"] });
  });

  it("validates the ward and unit catalog template and its required ward name", () => {
    expect(validateUnitCatalogExcelHeaders([...unitCatalogExcelHeaders])).toEqual({ valid: true, missing: [] });
    expect(validateUnitCatalogExcelHeaders(["Tên đơn vị/tổ"])).toEqual({ valid: false, missing: ["Tên xã, phường", "Số lượng thành viên tối đa"] });
    expect(validateUnitCatalogImportRow({ wardName: "Phường An Bình", unitName: "Tổ 1" })).toEqual({ valid: true, errors: [] });
    expect(validateUnitCatalogImportRow({ wardName: null, unitName: "Tổ 1" })).toEqual({ valid: false, errors: ["Thiếu Tên xã, phường"] });
    expect(validateUnitCatalogImportRow({ wardName: "Phường An Bình", unitName: "Tổ 1", maxMembers: 12 })).toEqual({ valid: true, errors: [] });
    expect(validateUnitCatalogImportRow({ wardName: "Phường An Bình", unitName: "Tổ 1", maxMembers: "12.5" })).toEqual({ valid: false, errors: ["Số lượng thành viên tối đa phải là số nguyên từ 0 đến 999"] });
    const seenRows = new Set<string>();
    expect(validateUnitCatalogImportRow({ wardName: "Phường An Bình", unitName: "Tổ 1", seenKeys: seenRows })).toEqual({ valid: true, errors: [] });
    expect(validateUnitCatalogImportRow({ wardName: "  phường  an bình ", unitName: "tổ 1", seenKeys: seenRows })).toEqual({ valid: false, errors: ["Trùng xã/phường và đơn vị/tổ với một dòng khác trong file"] });
    expect(validateUnitCatalogImportRow({ wardName: "Phường An Bình", unitName: "Tổ 1", existingKeys: new Set(["phường an bình|tổ 1"]) })).toEqual({ valid: false, errors: ["Đơn vị/tổ “Tổ 1” đã tồn tại trong xã/phường “Phường An Bình”"] });
  });
});
