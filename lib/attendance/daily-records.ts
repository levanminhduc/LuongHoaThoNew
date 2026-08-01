export interface DailyExportRecord {
  day: number;
  checkIn: string;
  checkOut: string;
  working: number;
  ot: number;
}

const MIN_DAY = 1;
const MAX_DAY = 31;

export function formatTimeHHmm(timeStr: string | null): string {
  if (!timeStr) return "";
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return timeStr;
}

export function parseNumericValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function pick(item: object, camelKey: string, snakeKey: string): unknown {
  if (camelKey in item) return (item as Record<string, unknown>)[camelKey];
  if (snakeKey in item) return (item as Record<string, unknown>)[snakeKey];
  return undefined;
}

function toDayNumber(raw: unknown): number {
  return typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
}

export function normalizeDailyRecords(value: unknown): DailyExportRecord[] {
  let rawValue = value;

  if (typeof rawValue === "string") {
    try {
      rawValue = JSON.parse(rawValue);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const day = toDayNumber(pick(item, "day", "work_day"));
    if (!Number.isInteger(day) || day < MIN_DAY || day > MAX_DAY) {
      return [];
    }

    const rawCheckIn = pick(item, "checkIn", "check_in_time");
    const rawCheckOut = pick(item, "checkOut", "check_out_time");

    return [
      {
        day,
        checkIn:
          typeof rawCheckIn === "string" ? formatTimeHHmm(rawCheckIn) : "",
        checkOut:
          typeof rawCheckOut === "string" ? formatTimeHHmm(rawCheckOut) : "",
        working: parseNumericValue(pick(item, "workingUnits", "working_units")),
        ot: parseNumericValue(pick(item, "overtimeUnits", "overtime_units")),
      },
    ];
  });
}
