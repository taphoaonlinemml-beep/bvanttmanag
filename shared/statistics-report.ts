import { buildForceBuildingStats, type ActivePersonnelAnalyticsRow, type DashboardCatalogUnit } from "./dashboard-analytics";

export type StatisticsPersonnelRow = ActivePersonnelAnalyticsRow & { status: "active" | "inactive"; ethnicity?: string | null };

export type WardStatisticsRow = {
  wardId: number;
  wardName: string;
  plannedMembers: number;
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  teamCount: number;
};

function asNumber(value: number | null | undefined) { return Number(value ?? 0); }

export function buildStatisticsReportData(units: DashboardCatalogUnit[], personnel: StatisticsPersonnelRow[]) {
  const wards = units.filter(unit => unit.unitType === "ward").sort((left, right) => left.name.localeCompare(right.name, "vi"));
  const teams = units.filter(unit => unit.unitType === "team" && unit.parentId !== null);
  const teamWardMap = new Map(teams.map(team => [team.id, team.parentId!]));
  const teamsByWard = new Map<number, DashboardCatalogUnit[]>();
  teams.forEach(team => teamsByWard.set(team.parentId!, [...(teamsByWard.get(team.parentId!) ?? []), team]));
  const membersByWard = new Map<number, StatisticsPersonnelRow[]>();
  personnel.forEach(member => {
    if (member.unitId === null) return;
    const wardId = teamWardMap.get(member.unitId);
    if (!wardId) return;
    membersByWard.set(wardId, [...(membersByWard.get(wardId) ?? []), member]);
  });

  const wardRows: WardStatisticsRow[] = wards.map(ward => {
    const wardTeams = teamsByWard.get(ward.id) ?? [];
    const wardPersonnel = membersByWard.get(ward.id) ?? [];
    return {
      wardId: ward.id,
      wardName: ward.name,
      plannedMembers: wardTeams.reduce((sum, team) => sum + Math.max(0, asNumber(team.maxMembers)), 0),
      totalMembers: wardPersonnel.length,
      activeMembers: wardPersonnel.filter(member => member.status === "active").length,
      inactiveMembers: wardPersonnel.filter(member => member.status === "inactive").length,
      teamCount: wardTeams.length,
    };
  });

  const activePersonnel = personnel.filter(member => member.status === "active");
  const forceBuilding = buildForceBuildingStats(activePersonnel);
  const metric = (sectionKey: string, metricName: string) => forceBuilding.find(section => section.key === sectionKey)?.items.find(item => item.name === metricName)?.value ?? 0;
  const ethnicMinority = activePersonnel.filter(member => {
    const ethnicity = (member.ethnicity ?? "").trim().toLocaleLowerCase("vi");
    return Boolean(ethnicity) && ethnicity !== "kinh";
  }).length;
  const totals = wardRows.reduce((result, row) => ({
    plannedMembers: result.plannedMembers + row.plannedMembers,
    totalMembers: result.totalMembers + row.totalMembers,
    activeMembers: result.activeMembers + row.activeMembers,
    inactiveMembers: result.inactiveMembers + row.inactiveMembers,
    teamCount: result.teamCount + row.teamCount,
  }), { plannedMembers: 0, totalMembers: 0, activeMembers: 0, inactiveMembers: 0, teamCount: 0 });

  return {
    wards: wardRows,
    totals,
    summaryRows: [
      { group: "Quy mô lực lượng", indicator: "Tổng số Tổ bảo vệ an ninh, trật tự", value: totals.teamCount },
      { group: "Quy mô lực lượng", indicator: "Quân số theo định mức", value: totals.plannedMembers },
      { group: "Quy mô lực lượng", indicator: "Tổng số hồ sơ nhân sự", value: totals.totalMembers },
      { group: "Quy mô lực lượng", indicator: "Số thành viên đang tham gia", value: totals.activeMembers },
      { group: "Quy mô lực lượng", indicator: "Số thành viên thôi tham gia", value: totals.inactiveMembers },
      { group: "Chức vụ", indicator: "Tổ trưởng đang tham gia", value: metric("position", "Tổ trưởng") },
      { group: "Chức vụ", indicator: "Tổ phó đang tham gia", value: metric("position", "Tổ phó") },
      { group: "Chức vụ", indicator: "Tổ viên đang tham gia", value: metric("position", "Tổ viên") },
      { group: "Độ tuổi", indicator: "Dưới 70 tuổi", value: metric("age", "Dưới 70 tuổi") },
      { group: "Độ tuổi", indicator: "Từ 70 tuổi trở lên", value: metric("age", "Từ 70 tuổi trở lên") },
      { group: "Giới tính", indicator: "Nam", value: metric("gender", "Nam") },
      { group: "Giới tính", indicator: "Nữ", value: metric("gender", "Nữ") },
      { group: "Trình độ", indicator: "Tiểu học", value: metric("education", "Tiểu học") },
      { group: "Trình độ", indicator: "THCS/THPT", value: metric("education", "THCS/THPT") },
      { group: "Trình độ", indicator: "Trung cấp/Cao đẳng", value: metric("education", "Trung cấp/Cao đẳng") },
      { group: "Trình độ", indicator: "Đại học trở lên", value: metric("education", "Đại học trở lên") },
      { group: "Đặc điểm", indicator: "Người dân tộc thiểu số đang tham gia", value: ethnicMinority },
    ],
  };
}
