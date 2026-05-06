export const ENDPOINTS = {
  auth: {
    logout: "/api/admin/logout",
  },
} as const;

export const QUERY_PARAMS = {
  SALARY_MONTH: "salary_month",
  PAYROLL_TYPE: "payroll_type",
  EMPLOYEE_ID: "employee_id",
  DEPARTMENT: "department",
  PAGE: "page",
  LIMIT: "limit",
  SEARCH: "search",
  IS_SIGNED: "is_signed",
} as const;
