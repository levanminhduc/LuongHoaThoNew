import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

function getVietnamMonthWithOffset(offset: number): string {
  const [yearText, monthText] = getVietnamTimestamp().slice(0, 7).split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const totalMonths = year * 12 + month - 1 + offset;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;

  return `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
}

export function getCurrentMonth(): string {
  return getVietnamMonthWithOffset(0);
}

export function getPreviousMonth(): string {
  return getVietnamMonthWithOffset(-1);
}

export function getRecentMonthOptions(count = 12) {
  return Array.from({ length: count }, (_, index) => {
    const value = getVietnamMonthWithOffset(-index);
    const [year, month] = value.split("-");

    return {
      value,
      label: `Tháng ${Number(month)}/${year}`,
    };
  });
}

export function formatVietnamMonthLabel(value: string): string {
  const [year, month] = value.split("-");

  if (month === "13") {
    return `Lương Tháng 13 - ${year}`;
  }

  return `Tháng ${Number(month)}/${year}`;
}

export function getPayrollMonthOptionsWithT13(years = 2) {
  const currentYear = Number(getVietnamTimestamp().slice(0, 4));
  const options: { value: string; label: string }[] = [];

  for (let index = 0; index < years; index++) {
    const year = currentYear - index;
    const t13Value = `${year}-13`;
    options.push({
      value: t13Value,
      label: formatVietnamMonthLabel(t13Value),
    });

    for (let month = 12; month >= 1; month--) {
      const value = `${year}-${String(month).padStart(2, "0")}`;
      options.push({ value, label: formatVietnamMonthLabel(value) });
    }
  }

  return options;
}

export function getCurrentVietnamYear(): number {
  return Number(getVietnamTimestamp().slice(0, 4));
}

export function getRecentYearOptions(count = 5) {
  const currentYear = getCurrentVietnamYear();

  return Array.from({ length: count }, (_, index) => currentYear - index);
}

export function getRecentMonthValues(count = 6) {
  return Array.from({ length: count }, (_, index) =>
    getVietnamMonthWithOffset(index - count + 1),
  );
}
