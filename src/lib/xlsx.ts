import * as XLSX from "xlsx";

export function downloadXlsx<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers: { key: keyof T; label: string }[],
  sheetName = "Sheet1",
) {
  const data = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const h of headers) o[h.label] = r[h.key] ?? "";
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data, { header: headers.map((h) => h.label) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}