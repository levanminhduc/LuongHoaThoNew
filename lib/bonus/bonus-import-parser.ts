import type { BonusDetailItem } from "@/lib/validations/bonus";

export interface ParsedBonusRow {
  employee_id: string;
  amount: number | null;
  detail_data: BonusDetailItem[];
}

function isEmptyCell(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function normalizeHeader(header: unknown): string {
  return String(header ?? "").trim();
}

export function findColumnIndex(headers: string[], columnName: string): number {
  const target = columnName.trim().toLowerCase();
  return headers.findIndex(
    (header) => normalizeHeader(header).toLowerCase() === target,
  );
}

export function detectColumnByCandidates(
  headers: string[],
  candidates: readonly string[],
): string {
  const normalizedCandidates = new Set(
    candidates.map((candidate) => candidate.trim().toLowerCase()),
  );
  const matched = headers.find((header) =>
    normalizedCandidates.has(normalizeHeader(header).toLowerCase()),
  );
  return matched ?? "";
}

export function parseAmount(raw: unknown): number | null {
  if (isEmptyCell(raw)) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw)
    .trim()
    .replace(/[,\s]/g, "")
    .replace(/[^\d.-]/g, "");
  if (cleaned === "") return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

export function parseDetailValue(raw: unknown): number | string {
  if (typeof raw === "number") return raw;
  const text = String(raw).trim();
  const numeric = Number(text);
  return text !== "" && Number.isFinite(numeric) ? numeric : text;
}

export function buildBonusDetailData(
  headers: string[],
  row: unknown[],
  excludedColumnIndexes: Set<number>,
): BonusDetailItem[] {
  const detail: BonusDetailItem[] = [];
  headers.forEach((header, index) => {
    if (excludedColumnIndexes.has(index)) return;
    const cell = row[index];
    if (isEmptyCell(cell)) return;
    const label = normalizeHeader(header);
    if (label === "") return;
    detail.push({ label, value: parseDetailValue(cell) });
  });
  return detail;
}

export function parseBonusRows(
  headers: string[],
  dataRows: unknown[][],
  employeeIdColumnIndex: number,
  amountColumnIndex: number,
): ParsedBonusRow[] {
  const excludedColumnIndexes = new Set([
    employeeIdColumnIndex,
    amountColumnIndex,
  ]);

  return dataRows.map((row) => ({
    employee_id: normalizeHeader(row[employeeIdColumnIndex]),
    amount: parseAmount(row[amountColumnIndex]),
    detail_data: buildBonusDetailData(headers, row, excludedColumnIndexes),
  }));
}
