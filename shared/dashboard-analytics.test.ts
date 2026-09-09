import { describe, expect, it } from "vitest";
import { buildForceBuildingStats, buildWardTreemap } from "./dashboard-analytics";

describe("dashboard analytics", () => {
  it("ranks wards by active members and colors fully staffed wards green", () => {
    const data = buildWardTreemap([
      { id: 1, name: "Xã A", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 2, name: "Xã B", unitType: "ward", parentId: null, maxMembers: 0 },
      { id: 3, name: "Tổ A", unitType: "team", parentId: 1, maxMembers: 2 },
      { id: 4, name: "Tổ B", unitType: "team", parentId: 2, maxMembers: 3 },
    ], [
      { unitId: 3, dateOfBirth: null, gender: "male", position: "Tổ viên", educationLevel: "THPT" },
      { unitId: 3, dateOfBirth: null, gender: "male", position: "Tổ viên", educationLevel: "THPT" },
      { unitId: 4, dateOfBirth: null, gender: "female", position: "Tổ viên", educationLevel: "THPT" },
    ]);
    expect(data).toEqual([expect.objectContaining({ wardName: "Xã A", activeMembers: 2, status: "complete", color: "#0f9d8a" }), expect.objectContaining({ wardName: "Xã B", activeMembers: 1, status: "shortage", color: "#f59e0b" })]);
  });

  it("groups active members into the requested force-building categories", () => {
    const stats = buildForceBuildingStats([{ unitId: 1, dateOfBirth: new Date("1950-01-01"), gender: "female", position: "Tổ trưởng", educationLevel: "Cao đẳng" }]);
    expect(stats.find(section => section.key === "age")?.items).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Từ 70 tuổi trở lên", value: 1 })]));
    expect(stats.find(section => section.key === "education")?.items).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Trung cấp/Cao đẳng", value: 1 })]));
  });
});
