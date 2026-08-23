import type { BonusPeriodOption } from "@/lib/bonus/bonus-types";
import type { ComboboxOption } from "@/components/ui/combobox";

const PERIOD_KEY_SEPARATOR = "__";

export function encodeBonusPeriodKey(
  bonusType: string,
  bonusPeriod: string,
): string {
  return `${bonusType}${PERIOD_KEY_SEPARATOR}${bonusPeriod}`;
}

export function findBonusPeriodByKey(
  periods: BonusPeriodOption[],
  key: string,
): BonusPeriodOption | undefined {
  return periods.find(
    (period) =>
      encodeBonusPeriodKey(period.bonus_type, period.bonus_period) === key,
  );
}

export function toBonusPeriodComboboxOptions(
  periods: BonusPeriodOption[],
): ComboboxOption[] {
  return periods.map((period) => ({
    value: encodeBonusPeriodKey(period.bonus_type, period.bonus_period),
    label: `${period.bonus_type_label} • ${period.bonus_period}${
      period.bonus_title ? ` — ${period.bonus_title}` : ""
    }`,
  }));
}
