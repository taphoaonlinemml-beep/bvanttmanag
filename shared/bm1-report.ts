import type { DashboardCatalogUnit } from "./dashboard-analytics";
import type { StatisticsPersonnelRow } from "./statistics-report";

export const BM1_WARD_ORDER = [
  "Xã Al Bá", "Xã An Hòa", "Xã An Lão", "Xã An Lương", "Xã An Nhơn Tây", "Xã An Toàn", "Xã An Vinh", "Xã Ayun", "Xã Ân Hảo", "Xã Ân Tường", "Xã Bàu Cạn", "Xã Biển Hồ", "Xã Bình An", "Xã Bình Dương", "Xã Bình Hiệp", "Xã Bình Khê", "Xã Bình Phú", "Xã Bờ Ngoong", "Xã Canh Liên", "Xã Canh Vinh", "Xã Cát Tiến", "Xã Chơ Long", "Xã Chư A Thai", "Xã Chư Krey", "Xã Chư Păh", "Xã Chư Pưh", "Xã Chư Prông", "Xã Chư Sê", "Xã Cửu An", "Xã Đak Đoa", "Xã Đak Pơ", "Xã Đak Rong", "Xã Đak Sơmei", "Xã Đăk Song", "Xã Đề Gi", "Xã Đức Cơ", "Xã Gào", "Xã Hòa Hội", "Xã Hoài Ân", "Xã Hội Sơn", "Xã Hra", "Xã Ia Băng", "Xã Ia Boòng", "Xã Ia Chia", "Xã Ia Dom", "Xã Ia Dơk", "Xã Ia Dreh", "Xã Ia Grai", "Xã Ia Hiao", "Xã Ia Hrú", "Xã Ia Hrung", "Xã Ia Khươl", "Xã Ia Ko", "Xã Ia Krái", "Xã Ia Krêl", "Xã Ia Lâu", "Xã Ia Le", "Xã Ia Ly", "Xã Ia Mơ", "Xã Ia Nan", "Xã Ia O", "Xã Ia Pa", "Xã Ia Phí", "Xã Ia Pia", "Xã Ia Pnôn", "Xã Ia Púch", "Xã Ia Rbol", "Xã Ia Rsai", "Xã Ia Sao", "Xã Ia Tôr", "Xã Ia Tul", "Xã Kbang", "Xã KDang", "Xã Kim Sơn", "Xã Kon Chiêng", "Xã Kon Gang", "Xã Kông Bơ La", "Xã Kông Chro", "Xã Krong", "Xã Lơ Pang", "Xã Mang Yang", "Xã Ngô Mây", "Xã Nhơn Châu", "Xã Phù Cát", "Xã Phù Mỹ", "Xã Phù Mỹ Bắc", "Xã Phù Mỹ Đông", "Xã Phù Mỹ Nam", "Xã Phù Mỹ Tây", "Xã Phú Thiện", "Xã Phú Túc", "Xã Pờ Tó", "Xã Sơn Lang", "Xã SRó", "Xã Tây Sơn", "Xã Tơ Tung", "Xã Tuy Phước", "Xã Tuy Phước Bắc", "Xã Tuy Phước Đông", "Xã Tuy Phước Tây", "Xã Uar", "Xã Vạn Đức", "Xã Vân Canh", "Xã Vĩnh Quang", "Xã Vĩnh Sơn", "Xã Vĩnh Thạnh", "Xã Vĩnh Thịnh", "Xã Xuân An", "Xã Ya Hội", "Xã Ya Ma", "Phường An Bình", "Phường An Khê", "Phường An Nhơn", "Phường An Nhơn Bắc", "Phường An Nhơn Đông", "Phường An Nhơn Nam", "Phường An Phú", "Phường Ayun Pa", "Phường Bình Định", "Phường Bồng Sơn", "Phường Diên Hồng", "Phường Hoài Nhơn", "Phường Hoài Nhơn Bắc", "Phường Hoài Nhơn Đông", "Phường Hoài Nhơn Nam", "Phường Hoài Nhơn Tây", "Phường Hội Phú", "Phường Pleiku", "Phường Quy Nhơn", "Phường Quy Nhơn Bắc", "Phường Quy Nhơn Đông", "Phường Quy Nhơn Nam", "Phường Quy Nhơn Tây", "Phường Tam Quan", "Phường Thống Nhất",
] as const;

export type Bm1Period = { startDate: Date; endDate: Date; label: string };
export type Bm1PersonnelRow = StatisticsPersonnelRow & { joinedAt: Date | null; leftAt: Date | null };
export type Bm1WardRow = { wardId: number; wardName: string; values: number[] };
export type Bm1CommendationRecord = { wardId: number; awardType: "certificate_collective" | "certificate_individual" | "letter_collective" | "letter_individual"; issuedAt: Date };
export type Bm1TrainingRecord = { wardId: number; issuedAt: Date };

function normalized(value: string) { return value.trim().toLocaleLowerCase("vi"); }
function atDayEnd(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999); }
function dayBefore(date: Date) { const value = new Date(date); value.setDate(value.getDate() - 1); return atDayEnd(value); }
function inPeriod(value: Date | null, period: Bm1Period) { return Boolean(value && value >= period.startDate && value <= period.endDate); }
function isActiveAt(member: Bm1PersonnelRow, date: Date) {
  if (member.joinedAt && member.joinedAt > date) return false;
  if (member.leftAt && member.leftAt <= date) return false;
  return member.status === "active" || Boolean(member.leftAt);
}
function ageAt(dateOfBirth: Date | null, onDate: Date) {
  if (!dateOfBirth) return null;
  let age = onDate.getFullYear() - dateOfBirth.getFullYear();
  if (onDate.getMonth() < dateOfBirth.getMonth() || (onDate.getMonth() === dateOfBirth.getMonth() && onDate.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}
function educationColumn(value: string | null) {
  const text = (value ?? "").trim().toLocaleLowerCase("vi");
  if (text.includes("tiểu học") || text.includes("tieu hoc")) return 7;
  if (text.includes("trung cấp") || text.includes("trung cap") || text.includes("cao đẳng") || text.includes("cao dang")) return 9;
  if (text.includes("đại học") || text.includes("dai hoc") || text.includes("sau đại học") || text.includes("sau dai hoc")) return 10;
  return 8;
}

export function buildBm1ReportData(units: DashboardCatalogUnit[], personnel: Bm1PersonnelRow[], wardIds: number[], period: Bm1Period, activities: { commendations: Bm1CommendationRecord[]; trainings: Bm1TrainingRecord[] } = { commendations: [], trainings: [] }) {
  const wardsById = new Map(units.filter(unit => unit.unitType === "ward").map(unit => [unit.id, unit]));
  const teams = units.filter(unit => unit.unitType === "team" && unit.parentId !== null);
  const teamsByWard = new Map<number, DashboardCatalogUnit[]>();
  const teamWardMap = new Map<number, number>();
  teams.forEach(team => { teamsByWard.set(team.parentId!, [...(teamsByWard.get(team.parentId!) ?? []), team]); teamWardMap.set(team.id, team.parentId!); });
  const membersByWard = new Map<number, Bm1PersonnelRow[]>();
  personnel.forEach(member => { const wardId = member.unitId ? teamWardMap.get(member.unitId) : undefined; if (wardId) membersByWard.set(wardId, [...(membersByWard.get(wardId) ?? []), member]); });
  const order = new Map(BM1_WARD_ORDER.map((name, index) => [normalized(name), index]));
  const selectedWards = wardIds.map(id => wardsById.get(id)).filter((ward): ward is DashboardCatalogUnit => Boolean(ward)).sort((left, right) => (order.get(normalized(left.name)) ?? Number.MAX_SAFE_INTEGER) - (order.get(normalized(right.name)) ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name, "vi"));
  const beforePeriod = dayBefore(period.startDate);

  const rows = selectedWards.map(ward => {
    const wardTeams = teamsByWard.get(ward.id) ?? [];
    const members = membersByWard.get(ward.id) ?? [];
    const current = members.filter(member => isActiveAt(member, period.endDate));
    const previous = members.filter(member => isActiveAt(member, beforePeriod));
    const values = Array.from({ length: 24 }, () => 0);
    values[0] = wardTeams.reduce((sum, team) => sum + Number(team.maxMembers ?? 0), 0);
    values[1] = previous.length;
    values[2] = current.length;
    values[3] = current.filter(member => member.gender === "male").length;
    values[4] = current.filter(member => member.gender === "female").length;
    values[5] = current.filter(member => { const age = ageAt(member.dateOfBirth, period.endDate); return age !== null && age < 70; }).length;
    values[6] = current.filter(member => { const age = ageAt(member.dateOfBirth, period.endDate); return age !== null && age >= 70; }).length;
    current.forEach(member => { values[educationColumn(member.educationLevel)] += 1; });
    values[11] = current.filter(member => { const ethnicity = (member.ethnicity ?? "").trim().toLocaleLowerCase("vi"); return Boolean(ethnicity) && ethnicity !== "kinh"; }).length;
    values[12] = wardTeams.length;
    values[13] = wardTeams.length;
    values[14] = members.filter(member => inPeriod(member.joinedAt, period)).length;
    values[15] = members.filter(member => inPeriod(member.leftAt, period)).length;
    const trainingsInPeriod = activities.trainings.filter(item => item.wardId === ward.id && inPeriod(item.issuedAt, period));
    values[18] = trainingsInPeriod.length;
    values[19] = trainingsInPeriod.length;
    activities.commendations.filter(item => item.wardId === ward.id && inPeriod(item.issuedAt, period)).forEach(item => {
      const awardColumn = item.awardType === "certificate_collective" ? 20 : item.awardType === "certificate_individual" ? 21 : item.awardType === "letter_collective" ? 22 : 23;
      values[awardColumn] += 1;
    });
    return { wardId: ward.id, wardName: ward.name, values };
  });
  const totals = Array.from({ length: 24 }, (_, index) => rows.reduce((sum, row) => sum + row.values[index], 0));
  return { rows, totals };
}
