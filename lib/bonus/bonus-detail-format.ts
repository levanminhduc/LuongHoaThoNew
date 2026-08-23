import { formatCurrency, formatNumber } from "@/lib/utils/date-formatter";
import type { BonusDetailItem } from "@/lib/validations/bonus";

const PLAIN_NUMBER_LABELS = new Set(["stt", "số tháng", "so thang"]);

export function formatBonusDetailValue(item: BonusDetailItem): string {
  if (typeof item.value !== "number") return item.value;
  return PLAIN_NUMBER_LABELS.has(item.label.trim().toLowerCase())
    ? formatNumber(item.value)
    : formatCurrency(item.value);
}

export function findBonusDetailValue(
  detailData: BonusDetailItem[],
  labelCandidates: readonly string[],
): string {
  const normalized = new Set(
    labelCandidates.map((candidate) => candidate.trim().toLowerCase()),
  );
  const item = detailData.find((detail) =>
    normalized.has(detail.label.trim().toLowerCase()),
  );
  return item ? formatBonusDetailValue(item) : "-";
}
