import { describe, expect, it } from "vitest";
import { getDashboardStatsWithExecutor } from "./db";

function thenable<T>(value: T) {
  const chain: Record<string, unknown> = {};
  ["from", "where", "leftJoin", "groupBy", "orderBy"].forEach(method => { chain[method] = () => chain; });
  chain.then = (resolve: (result: T) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(value).then(resolve, reject);
  return chain;
}

describe("getDashboardStatsWithExecutor", () => {
  it("reports teams separately from wards instead of summing both into the team count", async () => {
    const resultSets = [
      [{ total: 12, active: 9, inactive: 3 }],
      [{ unitType: "ward", total: 135 }, { unitType: "team", total: 1400 }],
      [
        { id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 },
        { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 5 },
        { id: 3, name: "Tổ 2", unitType: "team", parentId: 1, maxMembers: 4 },
      ],
      [
        { unitId: 2, dateOfBirth: new Date("1970-01-10"), gender: "male", position: "Tổ trưởng", educationLevel: "Đại học" },
        { unitId: 2, dateOfBirth: new Date("1990-03-10"), gender: "female", position: "Tổ phó", educationLevel: "THPT" },
        { unitId: 3, dateOfBirth: new Date("1995-05-10"), gender: "male", position: "Tổ viên", educationLevel: "Trung cấp" },
      ],
    ];
    let selectIndex = 0;
    const stats = await getDashboardStatsWithExecutor({ select: () => thenable(resultSets[selectIndex++]) });
    expect(stats).toMatchObject({ total: 12, active: 9, inactive: 3, totalWards: 135, totalTeams: 1400 });
    expect(stats.wardTreemap).toEqual([expect.objectContaining({ wardName: "Phường An Bình", activeMembers: 3, teamCount: 2, maxMembers: 9, status: "shortage" })]);
    expect(stats.forceBuilding.find(section => section.key === "position")?.items).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Tổ trưởng", value: 1 }), expect.objectContaining({ name: "Tổ phó", value: 1 }), expect.objectContaining({ name: "Tổ viên", value: 1 })]));
  });
});
