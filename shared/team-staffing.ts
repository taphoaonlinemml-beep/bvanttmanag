export type StaffingUnit = { id: number; name: string; unitType: string; parentId: number | null; maxMembers: number };
export type StaffingMember = { unitId: number | null; status: "active" | "inactive" };

export function summarizeTeamCapacity(currentMembers: number, maxMembers: number) {
  const normalizedCurrent = Math.max(0, currentMembers);
  const normalizedMax = Math.max(0, maxMembers);
  const isConfigured = normalizedMax > 0;
  return {
    currentMembers: normalizedCurrent,
    maxMembers: normalizedMax,
    availableMembers: isConfigured ? Math.max(0, normalizedMax - normalizedCurrent) : null,
    isOverCapacity: isConfigured && normalizedCurrent > normalizedMax,
  };
}

export function buildTeamStaffing(units: StaffingUnit[], members: StaffingMember[]) {
  const activeCounts = new Map<number, number>();
  members.filter(member => member.status === "active" && member.unitId !== null).forEach(member => activeCounts.set(member.unitId!, (activeCounts.get(member.unitId!) ?? 0) + 1));
  return buildTeamStaffingFromCounts(units, activeCounts);
}

export function buildTeamStaffingFromCounts(units: StaffingUnit[], activeCounts: Map<number, number>) {
  const wardNameById = new Map(units.filter(unit => unit.unitType === "ward").map(unit => [unit.id, unit.name]));
  return units.filter(unit => unit.unitType === "team").map(team => ({
    teamId: team.id,
    teamName: team.name,
    wardId: team.parentId,
    wardName: team.parentId ? wardNameById.get(team.parentId) ?? "Chưa liên kết xã/phường" : "Chưa liên kết xã/phường",
    ...summarizeTeamCapacity(activeCounts.get(team.id) ?? 0, team.maxMembers ?? 0),
  }));
}
