import { formatCurrency, formatNumber } from "@/lib/utils/date-formatter";
import type { BonusDetailItem } from "@/lib/validations/bonus";

const PLAIN_NUMBER_LABELS = new Set(["stt", "số tháng", "so thang"]);

export function formatBonusDetailValue(item: BonusDetailItem): string {
  if (typeof item.value !== "number") return item.value;
  return PLAIN_NUMBER_LABELS.has(item.label.trim().toLowerCase())
    ? formatNumber(item.value)
    : formatCurrency(item.value);
}
