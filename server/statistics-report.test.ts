import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createStatisticsReport } from "./statistics-report";

describe("createStatisticsReport", () => {
  it("tạo đúng một trang BM1 có tiêu đề, tên xã/phường và các cột số liệu", async () => {
    const buffer = await createStatisticsReport([
      { id: 1, name: "Xã An Hòa", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 11, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 5 },
    ], [{ unitId: 11, status: "active", joinedAt: new Date("2026-01-01"), leftAt: null, dateOfBirth: new Date("1980-01-01"), gender: "male", position: "Tổ trưởng", educationLevel: "Đại học", ethnicity: "Kinh" }], [1], { startDate: new Date("2026-01-15"), endDate: new Date("2026-02-14T23:59:59"), label: "Kỳ kiểm thử" });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("BM1");
    expect(workbook.worksheets).toHaveLength(1);
    expect(sheet?.getCell("A1").value).toContain("BIỂU MẪU 01");
    expect(sheet?.getCell("A2").value).toBe("Kỳ báo cáo: Kỳ kiểm thử");
    expect(sheet?.getCell("B8").value).toBe("Xã An Hòa");
    expect(sheet?.getCell("C8").value).toBe(5);
    expect(sheet?.getCell("E8").value).toBe(1);
    expect(sheet?.getCell("B9").value).toBe("TỔNG CỘNG");
  });
});
