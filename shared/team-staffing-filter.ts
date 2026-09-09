export type TeamStaffingFilterRow = {
  teamName: string;
  wardName: string;
};

export function filterTeamStaffing<T extends TeamStaffingFilterRow>(rows: T[], wardName: string, teamQuery: string) {
  const normalizedTeamQuery = teamQuery.trim().toLocaleLowerCase("vi");
  return rows.filter(row => {
    const matchesWard = wardName === "all" || row.wardName === wardName;
    const matchesTeam = !normalizedTeamQuery || row.teamName.toLocaleLowerCase("vi").includes(normalizedTeamQuery);
    return matchesWard && matchesTeam;
  });
}
