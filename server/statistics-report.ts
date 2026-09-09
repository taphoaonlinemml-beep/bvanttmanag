import ExcelJS from "exceljs";
import { buildBm1ReportData, type Bm1Period, type Bm1PersonnelRow, type Bm1CommendationRecord, type Bm1TrainingRecord } from "../shared/bm1-report";
import type { DashboardCatalogUnit } from "../shared/dashboard-analytics";

const navy = "FF0B2F5B";
const red = "FFB91D3B";
const paleBlue = "FFEAF2FB";
const thinBorder: Partial<ExcelJS.Borders> = { top: { style: "thin", color: { argb: "FF666666" } }, bottom: { style: "thin", color: { argb: "FF666666" } }, left: { style: "thin", color: { argb: "FF666666" } }, right: { style: "thin", color: { argb: "FF666666" } } };

function setMergedValue(sheet: ExcelJS.Worksheet, range: string, value: string) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = value;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.font = { name: "Times New Roman", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: red } };
}

function decorateRange(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, columns: number) {
  for (let row = fromRow; row <= toRow; row += 1) for (let column = 1; column <= columns; column += 1) {
    const cell = sheet.getCell(row, column);
    cell.border = thinBorder;
    cell.font = { name: "Times New Roman", size: 10 };
    cell.alignment = { horizontal: column <= 2 ? "left" : "center", vertical: "middle", wrapText: true };
  }
}

export async function createStatisticsReport(units: DashboardCatalogUnit[], personnel: Bm1PersonnelRow[], wardIds: number[], period: Bm1Period, activities: { commendations: Bm1CommendationRecord[]; trainings: Bm1TrainingRecord[] } = { commendations: [], trainings: [] }) {
  const report = buildBm1ReportData(units, personnel, wardIds, period, activities);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống Quản lý Lực lượng BVANTT Cơ sở";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("BM1", { views: [{ state: "frozen", ySplit: 7 }] });
  sheet.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.1, footer: 0.1 } };

  sheet.mergeCells("A1:Z1");
  const title = sheet.getCell("A1");
  title.value = "BIỂU MẪU 01\nTHỐNG KÊ SỐ LIỆU LỰC LƯỢNG THAM GIA BẢO VỆ ANTT Ở CƠ SỞ\n(Kèm theo Công văn số 435/V05-P3 ngày 12/03/2026 của V05)";
  title.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
  title.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 54;
  sheet.mergeCells("A2:Z2");
  sheet.getCell("A2").value = `Kỳ báo cáo: ${period.label}`;
  sheet.getCell("A2").font = { name: "Times New Roman", italic: true, size: 11 };
  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 22;

  setMergedValue(sheet, "A4:A6", "STT"); setMergedValue(sheet, "B4:B6", "Tên xã, phường"); setMergedValue(sheet, "C4:N4", "Thống kê lực lượng tham gia bảo vệ ANTT ở cơ sở"); setMergedValue(sheet, "O4:P4", "Thống kê Tổ bảo vệ ANTT ở cơ sở"); setMergedValue(sheet, "Q4:Q6", "Số lượng thành viên tuyển mới"); setMergedValue(sheet, "R4:R6", "Số lượng thành viên xin thôi không tham gia lực lượng bảo vệ ANTT ở cơ sở hoặc chết khi không tham gia nhiệm vụ"); setMergedValue(sheet, "S4:S6", "Số thành viên bị thương khi làm nhiệm vụ"); setMergedValue(sheet, "T4:T6", "Số thành viên hy sinh khi làm nhiệm vụ"); setMergedValue(sheet, "U4:V5", "Bồi dưỡng, huấn luyện theo tài liệu của Bộ"); setMergedValue(sheet, "W4:Z4", "Khen thưởng");
  setMergedValue(sheet, "C5:C6", "Tổng số thành viên theo Quyết định của UBND"); setMergedValue(sheet, "D5:D6", "Tổng số thành viên theo báo cáo kỳ trước liền kề"); setMergedValue(sheet, "E5:E6", "Tổng số thành viên thực tế hiện có"); setMergedValue(sheet, "F5:G5", "Giới tính"); setMergedValue(sheet, "H5:I5", "Độ tuổi"); setMergedValue(sheet, "J5:M5", "Trình độ"); setMergedValue(sheet, "N5:N6", "Số thành viên là người dân tộc thiểu số"); setMergedValue(sheet, "O5:O6", "Tổng số Tổ theo Quyết định của UBND"); setMergedValue(sheet, "P5:P6", "Tổng số Tổ thực tế hiện có");
  const leafHeaders = ["Nam", "Nữ", "Dưới 70", "Trên 70", "Tiểu học", "Trung học cơ sở; Trung học phổ thông", "Trung cấp; Cao đẳng", "Từ Đại học trở lên", "Số thành viên", "Số lớp", "Bằng khen\nTập thể", "Bằng khen\nCá nhân", "Giấy khen\nTập thể", "Giấy khen\nCá nhân"];
  const leafColumns = ["F", "G", "H", "I", "J", "K", "L", "M", "U", "V", "W", "X", "Y", "Z"];
  leafHeaders.forEach((label, index) => setMergedValue(sheet, `${leafColumns[index]}6:${leafColumns[index]}6`, label));
  for (let column = 1; column <= 26; column += 1) sheet.getCell(7, column).value = column === 1 ? "1" : column === 2 ? "Tên xã, phường" : String(column - 1);
  const headerNumbers = sheet.getRow(7); headerNumbers.font = { name: "Times New Roman", bold: true, size: 9 }; headerNumbers.alignment = { horizontal: "center", vertical: "middle" }; headerNumbers.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: paleBlue } }; cell.border = thinBorder; }); sheet.getRow(7).height = 18;

  report.rows.forEach((row, index) => sheet.addRow([index + 1, row.wardName, ...row.values]));
  const totalRow = sheet.addRow(["", "TỔNG CỘNG", ...report.totals]);
  decorateRange(sheet, 8, sheet.rowCount, 26);
  totalRow.font = { name: "Times New Roman", bold: true, color: { argb: navy } }; totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: paleBlue } };
  sheet.getColumn(1).width = 7; sheet.getColumn(2).width = 25; for (let column = 3; column <= 26; column += 1) sheet.getColumn(column).width = column === 11 ? 18 : column === 19 ? 26 : 12;
  for (let row = 4; row <= 6; row += 1) sheet.getRow(row).height = 50; sheet.getRow(5).height = 62;
  sheet.autoFilter = { from: "A7", to: `Z${Math.max(7, sheet.rowCount - 1)}` };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
