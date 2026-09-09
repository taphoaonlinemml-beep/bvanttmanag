import * as XLSX from "xlsx";
import { leaderDelegatedPermissionMeta, parseLeaderDelegatedPermissions } from "../shared/leader-permissions";

export type AccountExportSource = {
  id: number;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  username: string | null;
  role: "admin" | "leader" | "user";
  assignedWardName: string | null;
  mustChangePassword: boolean;
  adminPermissions: string | null;
  lastSignedIn: Date | null;
};

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(value) : "Chưa đăng nhập";
}

function roleLabel(role: AccountExportSource["role"]) {
  return role === "admin" ? "Admin" : role === "leader" ? "Lãnh đạo" : "User xã/phường";
}

export function createAccountHandoverReport(accounts: AccountExportSource[]) {
  const rows = accounts.map((account, index) => ({
    STT: index + 1,
    "Họ và tên": account.name ?? "",
    "Tên đăng nhập": account.username ?? "",
    "Email / định danh": account.email ?? "",
    "Loại đăng nhập": account.loginMethod === "local" ? "Tài khoản nội bộ" : "Đăng nhập tập trung",
    "Vai trò": roleLabel(account.role),
    "Xã/phường được giao": account.assignedWardName ?? "Toàn bộ / Không áp dụng",
    "Trạng thái mật khẩu": account.loginMethod === "local" ? account.mustChangePassword ? "Phải đổi mật khẩu tạm khi đăng nhập" : "Đã đổi mật khẩu tạm" : "Quản lý ngoài hệ thống",
    "Quyền bổ sung Lãnh đạo": account.role === "leader" ? parseLeaderDelegatedPermissions(account.adminPermissions).map(permission => leaderDelegatedPermissionMeta[permission].label).join("; ") || "Chỉ xem" : "",
    "Đăng nhập gần nhất": formatDate(account.lastSignedIn),
    "Ghi chú bàn giao": "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 6 }, { wch: 28 }, { wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 38 }, { wch: 42 }, { wch: 22 }, { wch: 30 },
  ];
  const guide = XLSX.utils.aoa_to_sheet([
    ["HƯỚNG DẪN BÀN GIAO TÀI KHOẢN"],
    ["1. Tệp này không chứa mật khẩu. Mật khẩu tạm cần được cấp qua kênh riêng, an toàn."],
    ["2. Tài khoản có trạng thái 'Phải đổi mật khẩu tạm' chỉ được dùng hệ thống sau khi đổi mật khẩu ngay lần đăng nhập đầu."],
    ["3. Mật khẩu mới tối thiểu 8 ký tự; khuyến nghị kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt."],
    ["4. Không gửi kèm mật khẩu qua nhóm chat công khai hoặc in chung trong danh sách bàn giao."],
  ]);
  guide["!cols"] = [{ wch: 110 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "DanhSachTaiKhoan");
  XLSX.utils.book_append_sheet(workbook, guide, "HuongDanBanGiao");
  return Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }));
}
