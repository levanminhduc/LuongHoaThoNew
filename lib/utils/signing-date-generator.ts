function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSigningDay(employeeId: string, salaryMonth: string): 1 | 2 {
  const hash = hashCode(`${employeeId}:${salaryMonth}`);
  return (hash % 2 === 0 ? 1 : 2) as 1 | 2;
}

export function formatAttendanceSigningDate(
  employeeId: string,
  salaryMonth: string,
  signedAt: string | null,
): string {
  if (!signedAt) return "";

  const parts = salaryMonth.split("-");
  if (parts.length < 2) return "";

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return "";

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const day = getSigningDay(employeeId, salaryMonth);
  const dd = String(day).padStart(2, "0");
  const mm = String(nextMonth).padStart(2, "0");

  return `${dd}/${mm}/${nextYear}`;
}
