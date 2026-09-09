import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { createAccountHandoverReport } from "./account-report";

describe("createAccountHandoverReport", () => {
  it("exports account handover fields without a password column and includes safety guidance", () => {
    const report = createAccountHandoverReport([{ id: 1, name: "Công an Xã An Lão", email: null, loginMethod: "local", username: "canbo.xanlao", role: "user", assignedWardName: "Xã An Lão", mustChangePassword: true, adminPermissions: null, lastSignedIn: null }]);
    const workbook = XLSX.read(report, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.DanhSachTaiKhoan!, { defval: "" });
    expect(workbook.SheetNames).toEqual(["DanhSachTaiKhoan", "HuongDanBanGiao"]);
    expect(rows[0]).toMatchObject({ "Tên đăng nhập": "canbo.xanlao", "Vai trò": "User xã/phường", "Trạng thái mật khẩu": "Phải đổi mật khẩu tạm khi đăng nhập" });
    expect(Object.keys(rows[0] ?? {})).not.toContain("Mật khẩu");
    expect(XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.HuongDanBanGiao!, { header: 1 })[1]?.[0]).toContain("không chứa mật khẩu");
  });
});
