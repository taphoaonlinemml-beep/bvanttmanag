import ExcelJS from "exceljs";

type CatalogUnit = { id: number; name: string; unitType: string; parentId: number | null };

function columnLetter(index: number) {
  let result = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    index = Math.floor((index - 1) / 26);
  }
  return result;
}

export async function createPersonnelTemplate(headers: readonly string[], units: CatalogUnit[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống Quản lý Lực lượng BVANTT Cơ sở";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("DanhSachNhanSu", { views: [{ state: "frozen", ySplit: 1 }] });
  const catalogSheet = workbook.addWorksheet("DanhMucDropdown", { state: "veryHidden" });
  const templateHeaders = [...headers];
  const wardHeaderIndex = templateHeaders.indexOf("Xa/Phuong");
  if (wardHeaderIndex < 0) throw new Error("Không tìm thấy cột Xã/phường trong cấu trúc file mẫu");
  templateHeaders.splice(wardHeaderIndex + 1, 0, "TenTo");
  worksheet.addRow(templateHeaders);
  worksheet.addRow(templateHeaders.map(() => ""));
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2F5B" } };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  worksheet.getRow(1).height = 30;
  worksheet.autoFilter = { from: "A1", to: `${columnLetter(templateHeaders.length)}1` };
  templateHeaders.forEach((header, index) => {
    worksheet.getColumn(index + 1).width = header === "Xa/Phuong" || header === "TenTo" ? 30 : Math.max(14, Math.min(28, header.length + 5));
  });
  worksheet.getCell("A2").note = "Nhập dữ liệu từ dòng 2. Chọn Xã/Phường trước, sau đó chọn Tên Tổ tương ứng.";
  const citizenIdColumnIndex = templateHeaders.indexOf("CCCD") + 1;
  const citizenIdColumn = columnLetter(citizenIdColumnIndex);
  if (citizenIdColumnIndex > 0) {
    worksheet.getColumn(citizenIdColumnIndex).numFmt = "@";
    worksheet.getCell(`${citizenIdColumn}1`).note = "Nhập CCCD gồm 9 hoặc 12 chữ số, không dùng dấu cách hoặc ký tự đặc biệt. Có thể để trống nếu chưa có CCCD.";
  }

  const wards = units.filter(unit => unit.unitType === "ward").sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const teamsByWard = new Map<number, CatalogUnit[]>();
  units.filter(unit => unit.unitType === "team").forEach(team => {
    if (!team.parentId) return;
    const teams = teamsByWard.get(team.parentId) ?? [];
    teams.push(team);
    teamsByWard.set(team.parentId, teams);
  });
  catalogSheet.getCell("A1").value = "XaPhuong";
  catalogSheet.getCell("B1").value = "TenVungTo";
  wards.forEach((ward, index) => {
    const row = index + 2;
    const rangeName = `TEAM_${ward.id}`;
    const teamColumn = index + 3;
    const teamColumnLetter = columnLetter(teamColumn);
    const teams = (teamsByWard.get(ward.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    catalogSheet.getCell(row, 1).value = ward.name;
    catalogSheet.getCell(row, 2).value = rangeName;
    catalogSheet.getCell(1, teamColumn).value = rangeName;
    if (teams.length) teams.forEach((team, teamIndex) => { catalogSheet.getCell(teamIndex + 2, teamColumn).value = team.name; });
    else catalogSheet.getCell(2, teamColumn).value = "";
    workbook.definedNames.add(`'DanhMucDropdown'!$${teamColumnLetter}$2:$${teamColumnLetter}$${Math.max(2, teams.length + 1)}`, rangeName);
  });
  if (wards.length) {
    workbook.definedNames.add(`'DanhMucDropdown'!$A$2:$A$${wards.length + 1}`, "Ward_List");
    workbook.definedNames.add(`'DanhMucDropdown'!$A$2:$B$${wards.length + 1}`, "Ward_Team_Map");
  }
  const wardColumn = columnLetter(wardHeaderIndex + 1);
  const teamColumn = columnLetter(wardHeaderIndex + 2);
  for (let row = 2; row <= 5001; row += 1) {
    if (citizenIdColumnIndex > 0) {
      worksheet.getCell(`${citizenIdColumn}${row}`).dataValidation = { type: "custom", allowBlank: true, formulae: [`=OR($${citizenIdColumn}${row}=\"\",AND(ISNUMBER(--$${citizenIdColumn}${row}),OR(LEN($${citizenIdColumn}${row})=9,LEN($${citizenIdColumn}${row})=12)))`], showInputMessage: true, promptTitle: "Số CCCD", prompt: "Nhập 9 hoặc 12 chữ số; để trống nếu chưa có.", showErrorMessage: true, errorStyle: "stop", errorTitle: "CCCD không hợp lệ", error: "CCCD phải có đúng 9 hoặc 12 chữ số." };
    }
    worksheet.getCell(`${wardColumn}${row}`).dataValidation = { type: "list", allowBlank: false, formulae: ["=Ward_List"], showErrorMessage: true, errorStyle: "stop", errorTitle: "Xã/phường không hợp lệ", error: "Vui lòng chọn Xã/Phường từ danh sách." };
    worksheet.getCell(`${teamColumn}${row}`).dataValidation = { type: "list", allowBlank: false, formulae: [`=INDIRECT(VLOOKUP($${wardColumn}${row},Ward_Team_Map,2,FALSE))`], showErrorMessage: true, errorStyle: "stop", errorTitle: "Tên Tổ không hợp lệ", error: "Chọn Xã/Phường trước, sau đó chọn Tên Tổ thuộc xã/phường đó." };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
