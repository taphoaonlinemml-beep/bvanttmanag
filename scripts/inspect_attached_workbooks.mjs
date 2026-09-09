import XLSX from "xlsx";
import fs from "node:fs";

const files = [
  "/home/ubuntu/upload/BM1TKlựclượngđịnhkỳ.xlsx",
  "/home/ubuntu/upload/danhsachxaphuong.xlsx",
];

const result = files.map(file => {
  const workbook = XLSX.readFile(file, { cellDates: true });
  return {
    file,
    sheets: workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      return {
        name,
        range: sheet["!ref"] ?? null,
        rows: XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }).slice(0, 20),
        merges: sheet["!merges"] ?? [],
        columnWidths: sheet["!cols"] ?? [],
      };
    }),
  };
});

const wardWorkbook = XLSX.readFile("/home/ubuntu/upload/danhsachxaphuong.xlsx");
const wardSheet = wardWorkbook.Sheets[wardWorkbook.SheetNames[0]];
const wardOrder = XLSX.utils.sheet_to_json(wardSheet, { header: 1, defval: null, raw: false })
  .slice(1)
  .map(row => ({ name: String(row[0] ?? "").trim(), order: Number(row[1]) }))
  .filter(row => row.name && Number.isFinite(row.order));
result.push({ file: "ward-order", wardOrder });

fs.writeFileSync("/home/ubuntu/tmp/attached-workbooks-inspection.json", JSON.stringify(result, null, 2));
console.log("/home/ubuntu/tmp/attached-workbooks-inspection.json");
