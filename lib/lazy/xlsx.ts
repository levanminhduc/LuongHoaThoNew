export async function getXLSX() {
  return import("xlsx");
}

export async function parseExcelFile(file: File): Promise<unknown> {
  const XLSX = await getXLSX();
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array" });
}

export async function exportAOAToExcel(
  data: unknown[][],
  filename: string,
  sheetName = "Sheet1",
) {
  const XLSX = await getXLSX();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export async function exportJSONToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = "Sheet1",
) {
  const XLSX = await getXLSX();
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
