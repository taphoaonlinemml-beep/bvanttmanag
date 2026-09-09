import { describe, expect, it } from "vitest";
import { buildBm1ReportData } from "./bm1-report";

describe("buildBm1ReportData", () => {
  it("giữ đúng thứ tự danh sách xã/phường và tổng hợp số liệu theo kỳ", () => {
    const result = buildBm1ReportData([
      { id: 1, name: "Xã An Hòa", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 2, name: "Xã Al Bá", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 11, name: "Tổ An Hòa", unitType: "team", parentId: 1, maxMembers: 5 },
      { id: 21, name: "Tổ Al Bá", unitType: "team", parentId: 2, maxMembers: 4 },
    ], [
      { unitId: 11, status: "active", joinedAt: new Date("2026-05-01"), leftAt: null, dateOfBirth: new Date("1980-03-01"), gender: "female", position: "Tổ viên", educationLevel: "THPT", ethnicity: "Kinh" },
      { unitId: 11, status: "active", joinedAt: new Date("2026-06-01"), leftAt: null, dateOfBirth: new Date("1995-03-01"), gender: "male", position: "Tổ trưởng", educationLevel: "Đại học", ethnicity: "Ba Na" },
      { unitId: 11, status: "inactive", joinedAt: new Date("2026-04-01"), leftAt: new Date("2026-06-10"), dateOfBirth: new Date("1940-03-01"), gender: "male", position: "Tổ viên", educationLevel: "Tiểu học", ethnicity: "Kinh" },
    ], [1, 2], { startDate: new Date("2026-05-15"), endDate: new Date("2026-06-14T23:59:59"), label: "Kỳ thử" }, {
      commendations: [
        { wardId: 1, awardType: "certificate_individual", issuedAt: new Date("2026-06-02") },
        { wardId: 1, awardType: "letter_individual", issuedAt: new Date("2026-06-03") },
      ],
      trainings: [{ wardId: 1, issuedAt: new Date("2026-06-04") }],
    });

    expect(result.rows.map(row => row.wardName)).toEqual(["Xã Al Bá", "Xã An Hòa"]);
    expect(result.rows[1].values).toEqual([5, 2, 2, 1, 1, 2, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1]);
    expect(result.totals).toEqual([9, 2, 2, 1, 1, 2, 0, 0, 1, 0, 1, 1, 2, 2, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1]);
  });
});
