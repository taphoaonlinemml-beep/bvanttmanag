import { describe, expect, it } from "vitest";
import { buildStatisticsReportData } from "./statistics-report";

describe("buildStatisticsReportData", () => {
  it("tổng hợp đúng quân số, hồ sơ và trạng thái theo xã/phường", () => {
    const result = buildStatisticsReportData([
      { id: 1, name: "Xã An Hòa", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 2, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 11, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 5 },
      { id: 12, name: "Tổ 2", unitType: "team", parentId: 1, maxMembers: 4 },
      { id: 21, name: "Tổ 3", unitType: "team", parentId: 2, maxMembers: 6 },
    ], [
      { unitId: 11, status: "active", dateOfBirth: new Date("1990-01-01"), gender: "male", position: "Tổ trưởng", educationLevel: "Đại học", ethnicity: "Kinh" },
      { unitId: 12, status: "inactive", dateOfBirth: new Date("1950-01-01"), gender: "female", position: "Tổ viên", educationLevel: "THPT", ethnicity: "Ba Na" },
      { unitId: 21, status: "active", dateOfBirth: new Date("1980-01-01"), gender: "female", position: "Tổ phó", educationLevel: "Cao đẳng", ethnicity: "Jrai" },
    ]);

    expect(result.wards).toEqual(expect.arrayContaining([
      expect.objectContaining({ wardName: "Xã An Hòa", plannedMembers: 9, totalMembers: 2, activeMembers: 1, inactiveMembers: 1, teamCount: 2 }),
      expect.objectContaining({ wardName: "Phường An Bình", plannedMembers: 6, totalMembers: 1, activeMembers: 1, inactiveMembers: 0, teamCount: 1 }),
    ]));
    expect(result.totals).toEqual({ plannedMembers: 15, totalMembers: 3, activeMembers: 2, inactiveMembers: 1, teamCount: 3 });
    expect(result.summaryRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ indicator: "Tổ trưởng đang tham gia", value: 1 }),
      expect.objectContaining({ indicator: "Người dân tộc thiểu số đang tham gia", value: 1 }),
    ]));
  });
});
