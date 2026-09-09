export type DashboardCatalogUnit = { id: number; name: string; unitType: string; parentId: number | null; maxMembers: number };
export type ActivePersonnelAnalyticsRow = { unitId: number | null; dateOfBirth: Date | null; gender: "male" | "female" | "other" | null; position: string | null; educationLevel: string | null };

type ForceMetric = { name: string; value: number; color: string };

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("vi");
}

function ageAtToday(dateOfBirth: Date | null) {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = today.getMonth() - dateOfBirth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}

function educationGroup(value: string | null) {
  const text = normalized(value);
  if (text.includes("đại học") || text.includes("dai hoc") || text.includes("sau đại học") || text.includes("sau dai hoc")) return "Đại học trở lên";
  if (text.includes("trung cấp") || text.includes("trung cap") || text.includes("cao đẳng") || text.includes("cao dang")) return "Trung cấp/Cao đẳng";
  if (text.includes("thcs") || text.includes("thpt") || text.includes("trung học") || text.includes("trung hoc")) return "THCS/THPT";
  if (text.includes("tiểu học") || text.includes("tieu hoc")) return "Tiểu học";
  return "Chưa cập nhật";
}

export function buildForceBuildingStats(rows: ActivePersonnelAnalyticsRow[]) {
  const positions: Record<string, number> = { "Tổ trưởng": 0, "Tổ phó": 0, "Tổ viên": 0 };
  const ages: Record<string, number> = { "Dưới 70 tuổi": 0, "Từ 70 tuổi trở lên": 0, "Chưa cập nhật": 0 };
  const genders: Record<string, number> = { Nam: 0, Nữ: 0, "Chưa cập nhật": 0 };
  const education: Record<string, number> = { "Tiểu học": 0, "THCS/THPT": 0, "Trung cấp/Cao đẳng": 0, "Đại học trở lên": 0, "Chưa cập nhật": 0 };

  rows.forEach(row => {
    const position = normalized(row.position);
    if (position.includes("tổ trưởng") || position.includes("to truong")) positions["Tổ trưởng"] += 1;
    else if (position.includes("tổ phó") || position.includes("to pho")) positions["Tổ phó"] += 1;
    else positions["Tổ viên"] += 1;

    const age = ageAtToday(row.dateOfBirth);
    if (age === null) ages["Chưa cập nhật"] += 1;
    else if (age >= 70) ages["Từ 70 tuổi trở lên"] += 1;
    else ages["Dưới 70 tuổi"] += 1;

    if (row.gender === "male") genders.Nam += 1;
    else if (row.gender === "female") genders.Nữ += 1;
    else genders["Chưa cập nhật"] += 1;

    education[educationGroup(row.educationLevel)] += 1;
  });

  const mapMetrics = (values: Record<string, number>, colors: string[]): ForceMetric[] => Object.entries(values).map(([name, value], index) => ({ name, value, color: colors[index] ?? "#94a3b8" }));
  return [
    { key: "position", title: "Chức vụ", color: "#028a91", items: mapMetrics(positions, ["#84b61d", "#a3ce45", "#d1e789"]) },
    { key: "age", title: "Độ tuổi", color: "#e45e46", items: mapMetrics(ages, ["#ef4444", "#fb7185", "#cbd5e1"]) },
    { key: "gender", title: "Giới tính", color: "#149daa", items: mapMetrics(genders, ["#0ea5e9", "#67e8f9", "#cbd5e1"]) },
    { key: "education", title: "Trình độ", color: "#c59b17", items: mapMetrics(education, ["#fde047", "#facc15", "#eab308", "#ca8a04", "#cbd5e1"]) },
  ];
}

export function buildWardTreemap(units: DashboardCatalogUnit[], activePersonnel: ActivePersonnelAnalyticsRow[]) {
  const wards = units.filter(unit => unit.unitType === "ward");
  const teams = units.filter(unit => unit.unitType === "team" && unit.parentId !== null);
  const activeByTeam = new Map<number, number>();
  activePersonnel.filter(person => person.unitId !== null).forEach(person => activeByTeam.set(person.unitId!, (activeByTeam.get(person.unitId!) ?? 0) + 1));
  const teamsByWard = new Map<number, DashboardCatalogUnit[]>();
  teams.forEach(team => teamsByWard.set(team.parentId!, [...(teamsByWard.get(team.parentId!) ?? []), team]));
  return wards.map(ward => {
    const wardTeams = teamsByWard.get(ward.id) ?? [];
    const activeMembers = wardTeams.reduce((total, team) => total + (activeByTeam.get(team.id) ?? 0), 0);
    const maxMembers = wardTeams.reduce((total, team) => total + Math.max(0, team.maxMembers ?? 0), 0);
    const teamCount = wardTeams.length;
    const isConfigured = maxMembers > 0;
    const status = !isConfigured ? "unconfigured" : activeMembers >= maxMembers ? "complete" : "shortage";
    return {
      wardId: ward.id,
      wardName: ward.name,
      activeMembers,
      teamCount,
      maxMembers,
      averageMembers: teamCount ? activeMembers / teamCount : 0,
      status,
      color: status === "complete" ? "#0f9d8a" : status === "shortage" ? "#f59e0b" : "#94a3b8",
    };
  }).sort((left, right) => right.activeMembers - left.activeMembers || left.wardName.localeCompare(right.wardName, "vi"));
}
