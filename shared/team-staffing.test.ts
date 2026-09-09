import { describe, expect, it } from "vitest";
import { buildTeamStaffing, summarizeTeamCapacity } from "./team-staffing";

describe("team staffing capacity", () => {
  it("reports remaining positions when the team is under its configured limit", () => {
    expect(summarizeTeamCapacity(7, 10)).toEqual({ currentMembers: 7, maxMembers: 10, availableMembers: 3, isOverCapacity: false });
  });

  it("flags teams exceeding their configured limit and tolerates an unset limit", () => {
    expect(summarizeTeamCapacity(12, 10)).toEqual({ currentMembers: 12, maxMembers: 10, availableMembers: 0, isOverCapacity: true });
    expect(summarizeTeamCapacity(5, 0)).toEqual({ currentMembers: 5, maxMembers: 0, availableMembers: null, isOverCapacity: false });
  });

  it("updates team staffing correctly after creating, editing, transferring and removing personnel", () => {
    const units = [{ id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 }, { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 2 }, { id: 3, name: "Tổ 2", unitType: "team", parentId: 1, maxMembers: 1 }];
    const members = [{ unitId: 2, status: "active" as const }];
    expect(buildTeamStaffing(units, members)[0]).toMatchObject({ teamId: 2, currentMembers: 1, availableMembers: 1 });
    members.push({ unitId: 2, status: "active" });
    expect(buildTeamStaffing(units, members)[0]).toMatchObject({ teamId: 2, currentMembers: 2, availableMembers: 0 });
    members[1] = { unitId: 3, status: "active" };
    expect(buildTeamStaffing(units, members).map(item => [item.teamId, item.currentMembers])).toEqual([[2, 1], [3, 1]]);
    members[0] = { unitId: 2, status: "inactive" };
    expect(buildTeamStaffing(units, members)[0]).toMatchObject({ teamId: 2, currentMembers: 0, availableMembers: 2 });
    members.splice(1, 1);
    expect(buildTeamStaffing(units, members)[1]).toMatchObject({ teamId: 3, currentMembers: 0, availableMembers: 1 });
  });
});
