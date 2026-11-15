export const SALARY_STATS_ROLES: readonly string[] = [
  "admin",
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
  "truong_phong",
  "to_truong",
];

export const DEPARTMENT_LIST_ROLES: string[] = [
  ...SALARY_STATS_ROLES,
  "van_phong",
];

const SALARY_AMOUNT_KEYS = ["totalSalary", "averageSalary"];

export function redactSalaryStats<T extends object>(
  role: string,
  departments: T[],
): T[] {
  if (SALARY_STATS_ROLES.includes(role)) return departments;
  return departments.map(
    (department) =>
      Object.fromEntries(
        Object.entries(department).filter(
          ([key]) => !SALARY_AMOUNT_KEYS.includes(key),
        ),
      ) as T,
  );
}
