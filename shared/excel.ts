export const personnelExcelHeaders = [
  "STT", "HoTen", "NgaySinh", "GioiTinh", "TrinhDo", "DanToc", "ChucVu", "KetQuaChinhSach", "CCCD", "TonGiao", "DiaChi", "Xa/Phuong", "NgayThamGiaCAXBCT,BVDP", "NgayThamGiaLLTGBVANTT", "NgayThoiCAXBCT,BVDP", "NgayThoiThamGiaLLTGBVANTT", "Sodienthoai", "SoGCNsudungCCHT", "Ghichu", "Khenthuong", "MucXeploai", "Qdxeploai",
] as const;

export const unitCatalogExcelHeaders = ["Tên xã, phường", "Tên đơn vị/tổ", "Số lượng thành viên tối đa"] as const;

function normalizeHeader(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim().replace(/\s+/g, " ");
}

export function validatePersonnelExcelHeaders(headers: unknown[]) {
  const actual = new Set(headers.map(normalizeHeader));
  const missing = personnelExcelHeaders.filter(header => header === "DiaChi" ? !actual.has("DiaChi") && !actual.has("Thon/Todanpho") : !actual.has(header));
  return { valid: missing.length === 0, missing };
}

export function validateUnitCatalogExcelHeaders(headers: unknown[]) {
  const actual = new Set(headers.map(normalizeHeader));
  const missing = unitCatalogExcelHeaders.filter(header => !actual.has(header));
  return { valid: missing.length === 0, missing };
}

export function normalizeCatalogName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export function unitCatalogRowKey(wardName: string, unitName: string | null) {
  return `${normalizeCatalogName(wardName)}|${unitName ? normalizeCatalogName(unitName) : ""}`;
}

export function parseMaxMembers(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 999 ? parsed : null;
}

export function isValidCitizenId(value: string | null | undefined) {
  return !value || /^\d{9}(\d{3})?$/.test(value);
}

export function isParseableSpreadsheetDate(value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === "number") return value > 0 && value < 100_000;
  const normalized = String(value).trim();
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(normalized)) return true;
  return !Number.isNaN(new Date(normalized).getTime());
}

export function validatePersonnelImportRow(input: {
  fullName: string | null;
  citizenId: string | null;
  dateOfBirth: unknown;
  unitName: string | null;
  knownUnitNames: Set<string>;
}) {
  const errors: string[] = [];
  if (!input.fullName) errors.push("Thiếu Họ tên");
  if (!isParseableSpreadsheetDate(input.dateOfBirth)) errors.push("Ngày sinh không hợp lệ");
  if (!isValidCitizenId(input.citizenId)) errors.push("CCCD phải có 9 hoặc 12 chữ số");
  if (!input.unitName) errors.push("Thiếu Tổ");
  if (input.unitName && !input.knownUnitNames.has(input.unitName.trim().toLocaleLowerCase("vi"))) errors.push(`Không tìm thấy Tổ “${input.unitName}” trong danh mục`);
  return { valid: errors.length === 0, errors };
}

export function validateUnitCatalogImportRow(input: { wardName: string | null; unitName: string | null; maxMembers?: unknown; seenKeys?: Set<string>; existingKeys?: Set<string> }) {
  const errors: string[] = [];
  if (!input.wardName) errors.push("Thiếu Tên xã, phường");
  if (input.wardName && input.wardName.length > 255) errors.push("Tên xã, phường không vượt quá 255 ký tự");
  if (input.unitName && input.unitName.length > 255) errors.push("Tên đơn vị/tổ không vượt quá 255 ký tự");
  const maxMembers = parseMaxMembers(input.maxMembers);
  if (maxMembers === null) errors.push("Số lượng thành viên tối đa phải là số nguyên từ 0 đến 999");
  if (!input.unitName && maxMembers && maxMembers > 0) errors.push("Chỉ nhập số lượng thành viên tối đa khi có Tổ");
  if (input.wardName && errors.length === 0) {
    const key = unitCatalogRowKey(input.wardName, input.unitName);
    if (input.seenKeys?.has(key)) errors.push("Trùng xã/phường và đơn vị/tổ với một dòng khác trong file");
    else input.seenKeys?.add(key);
    if (input.unitName && input.existingKeys?.has(key)) errors.push(`Đơn vị/tổ “${input.unitName}” đã tồn tại trong xã/phường “${input.wardName}”`);
  }
  return { valid: errors.length === 0, errors };
}
