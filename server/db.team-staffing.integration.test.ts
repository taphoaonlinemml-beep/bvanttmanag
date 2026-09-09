import { describe, expect, it } from "vitest";
import { getTeamStaffingWithExecutor } from "./db";

describe("getTeamStaffingWithExecutor", () => {
  it("reflects create, edit, transfer and removal operations from the personnel data source", async () => {
    const units = [{ id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 }, { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 2 }, { id: 3, name: "Tổ 2", unitType: "team", parentId: 1, maxMembers: 1 }];
    const personnel: Array<{ unitId: number; status: "active" | "inactive" }> = [];
    const executor = { select: () => ({ from: () => ({ orderBy: async () => units, groupBy: async () => {
      const grouped = new Map<number, number>();
      personnel.filter(record => record.status === "active").forEach(record => grouped.set(record.unitId, (grouped.get(record.unitId) ?? 0) + 1));
      return [...grouped.entries()].map(([unitId, currentMembers]) => ({ unitId, currentMembers }));
    } }) }) };

    personnel.push({ unitId: 2, status: "active" });
    expect((await getTeamStaffingWithExecutor(executor))[0]).toMatchObject({ teamId: 2, currentMembers: 1, availableMembers: 1 });
    personnel.push({ unitId: 2, status: "active" });
    expect((await getTeamStaffingWithExecutor(executor))[0]).toMatchObject({ teamId: 2, currentMembers: 2, availableMembers: 0 });
    personnel[1].unitId = 3;
    expect(await getTeamStaffingWithExecutor(executor)).toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 2, currentMembers: 1, maxMembers: 2, availableMembers: 1, isOverCapacity: false }), expect.objectContaining({ teamId: 3, currentMembers: 1, maxMembers: 1, availableMembers: 0, isOverCapacity: false })]));
    personnel[0].status = "inactive";
    personnel.splice(1, 1);
    expect(await getTeamStaffingWithExecutor(executor)).toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 2, currentMembers: 0, availableMembers: 2 }), expect.objectContaining({ teamId: 3, currentMembers: 0, availableMembers: 1 })]));
  });
});
