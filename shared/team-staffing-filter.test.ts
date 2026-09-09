import { describe, expect, it } from "vitest";
import { filterTeamStaffing } from "./team-staffing-filter";

describe("filterTeamStaffing", () => {
  const rows = [
    { teamName: "Tổ bảo vệ an ninh, trật tự 01", wardName: "Xã An Lão", currentMembers: 4 },
    { teamName: "Tổ bảo vệ an ninh, trật tự 02", wardName: "Xã An Lão", currentMembers: 5 },
    { teamName: "Tổ bảo vệ an ninh, trật tự 01", wardName: "Phường Quy Nhơn", currentMembers: 6 },
  ];

  it("filters by ward", () => {
    expect(filterTeamStaffing(rows, "Xã An Lão", "")).toHaveLength(2);
  });

  it("filters by a case-insensitive partial team name", () => {
    expect(filterTeamStaffing(rows, "all", "TỔ BẢO VỆ AN NINH, TRẬT TỰ 02").map(row => row.currentMembers)).toEqual([5]);
  });

  it("combines ward and team filters and returns all rows when reset", () => {
    expect(filterTeamStaffing(rows, "Xã An Lão", "01").map(row => row.currentMembers)).toEqual([4]);
    expect(filterTeamStaffing(rows, "all", "")).toHaveLength(3);
  });
});
