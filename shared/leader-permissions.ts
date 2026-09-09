export const leaderDelegatedPermissionKeys = [
  "managePersonnel",
  "deletePersonnel",
  "manageUnits",
  "manageAccounts",
  "manageBackup",
  "manageMobileSync",
  "transferData",
] as const;

export type LeaderDelegatedPermission = (typeof leaderDelegatedPermissionKeys)[number];

export const leaderDelegatedPermissionMeta: Record<LeaderDelegatedPermission, { label: string; description: string }> = {
  managePersonnel: { label: "Quản lý hồ sơ", description: "Thêm, sửa, tải tệp và nhập hàng loạt hồ sơ trên toàn bộ địa bàn." },
  deletePersonnel: { label: "Xóa hồ sơ", description: "Xem, xử lý yêu cầu xóa và xóa trực tiếp hồ sơ, tệp nhân sự." },
  manageUnits: { label: "Quản lý xã/phường, Tổ", description: "Thêm, sửa, xóa hoặc nhập danh mục đơn vị/Tổ." },
  manageAccounts: { label: "Quản lý tài khoản", description: "Tạo, cấp lại mật khẩu, phân công địa bàn và xử lý quyền chỉnh sửa; không được tạo hoặc nâng quyền Admin." },
  manageBackup: { label: "Backup và dữ liệu", description: "Xem nhật ký, ghi nhận backup/restore và nhập dữ liệu nhân sự hàng loạt." },
  manageMobileSync: { label: "Mobile Sync", description: "Tạo, thu hồi token và xem nhật ký đồng bộ ứng dụng di động." },
  transferData: { label: "Chuyển dữ liệu đơn vị", description: "Chuyển hồ sơ khi sáp nhập, chia tách hoặc điều chỉnh đơn vị hành chính." },
};

export function parseLeaderDelegatedPermissions(value: string | null | undefined): LeaderDelegatedPermission[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((permission): permission is LeaderDelegatedPermission => typeof permission === "string" && (leaderDelegatedPermissionKeys as readonly string[]).includes(permission));
  } catch {
    return [];
  }
}

export function hasLeaderDelegatedPermission(value: string | null | undefined, permission: LeaderDelegatedPermission) {
  return parseLeaderDelegatedPermissions(value).includes(permission);
}
