export const ENDPOINTS = {
  employees: {
    list: "/api/admin/employees",
    all: "/api/employees/all-employees",
    detail: (id: string) => `/api/admin/employees/${encodeURIComponent(id)}`,
    auditLogs: (id: string) =>
      `/api/admin/employees/${encodeURIComponent(id)}/audit-logs`,
    create: "/api/admin/employees",
    import: "/api/admin/import-employees",
    update: (id: string) => `/api/admin/employees/${encodeURIComponent(id)}`,
    delete: (id: string) => `/api/admin/employees/${encodeURIComponent(id)}`,
    updateCccd: "/api/employees/update-cccd",
  },
  payroll: {
    search: "/api/admin/payroll/search",
    detail: (payrollId: string | number) =>
      `/api/admin/payroll/${encodeURIComponent(String(payrollId))}`,
    update: (payrollId: string | number) =>
      `/api/admin/payroll/${encodeURIComponent(String(payrollId))}`,
    audit: (payrollId: string | number) =>
      `/api/admin/payroll/audit/${encodeURIComponent(String(payrollId))}`,
    sign: "/api/employee/sign-salary",
    bulkSign: "/api/admin/bulk-sign-salary",
    import: "/api/admin/payroll-import",
    importDual: "/api/admin/import-dual-files",
    export: "/api/admin/payroll-export",
    bulkExport: "/api/admin/bulk-payroll-export",
    unsignedExport: "/api/admin/unsigned-employees-export",
    exportTemplate: "/api/admin/payroll-export-template",
    exportImportErrors: "/api/admin/export-import-errors",
    preview: "/api/admin/payroll-preview",
    advancedUpload: "/api/admin/advanced-upload",
    myDepartments: "/api/payroll/my-departments",
    myDepartment: "/api/payroll/my-department",
    myData: "/api/payroll/my-data",
    payslip: (payrollId: string | number) =>
      `/api/payroll/payslip/${encodeURIComponent(String(payrollId))}`,
  },
  signature: {
    history: "/api/signature-history",
    status: (salaryMonth: string) =>
      `/api/signature-status/${encodeURIComponent(salaryMonth)}`,
    stats: (salaryMonth: string) =>
      `/api/admin/signature-stats/${encodeURIComponent(salaryMonth)}`,
    progress: (salaryMonth: string) =>
      `/api/signature-progress/${encodeURIComponent(salaryMonth)}`,
    management: "/api/management-signature",
    bulkHistory: "/api/admin/bulk-signature-history",
    updateDate: "/api/admin/update-signature-date",
    updateManagementDate: "/api/admin/update-management-signature-date",
  },
  attendance: {
    employees: "/api/admin/attendance-employees",
    import: "/api/admin/attendance-import",
    export: "/api/admin/attendance-export",
  },
  departments: {
    list: "/api/admin/departments",
    detail: (departmentName: string) =>
      `/api/admin/departments/${encodeURIComponent(departmentName)}`,
    permissions: "/api/admin/department-permissions",
  },
  dashboard: {
    stats: "/api/admin/dashboard-stats",
    syncTemplate: "/api/admin/sync-template",
  },
  templates: {
    employee: "/api/admin/download-employee-template",
    attendance: "/api/admin/download-attendance-template",
    payroll: "/api/admin/payroll-export-template",
    alias: "/api/admin/generate-alias-template",
    importGenerated: "/api/admin/generate-import-template",
  },
  mappingConfigs: {
    list: "/api/admin/mapping-configurations",
    create: "/api/admin/mapping-configurations",
    update: "/api/admin/mapping-configurations",
    detail: (id: string | number) =>
      `/api/admin/mapping-configurations/${encodeURIComponent(String(id))}`,
  },
  columnAliases: {
    list: "/api/admin/column-aliases",
    detail: (id: string | number) =>
      `/api/admin/column-aliases/${encodeURIComponent(String(id))}`,
    generateTemplate: "/api/admin/generate-alias-template",
  },
  passwordResetHistory: {
    list: "/api/admin/password-reset-history",
  },
  dataValidation: {
    list: "/api/admin/data-validation",
  },
  importHistory: {
    list: "/api/admin/import-history",
  },
  auth: {
    logout: "/api/admin/logout",
  },
  apiDocs: {
    openapi: "/api/api-docs/openapi",
  },
  debug: {
    departments: "/api/debug/departments",
    countDepartments: "/api/debug/count-departments",
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
  IS_ACTIVE: "is_active",
  IS_T13: "is_t13",
  QUERY: "q",
  OFFSET: "offset",
  INCLUDE_DATA: "includeData",
  SALARY_MONTH_CAMEL: "salaryMonth",
  CONFIG_ID: "configId",
  INCLUDE_STATS: "include_stats",
  FORCE_REFRESH: "force_refresh",
  MONTH: "month",
  YEAR: "year",
  PERIOD_YEAR: "period_year",
  PERIOD_MONTH: "period_month",
  ROLE: "role",
  ID: "id",
  BATCH_ID: "batch_id",
  DATABASE_FIELD: "database_field",
  ALIAS_NAME: "alias_name",
  CONFIDENCE_MIN: "confidence_min",
  CONFIDENCE_MAX: "confidence_max",
  SORT_BY: "sort_by",
  SORT_ORDER: "sort_order",
  TIMESTAMP_ONLY: "timestamp_only",
  CONFIG_NAME: "config_name",
  IS_DEFAULT: "is_default",
  CREATED_BY: "created_by",
  EMPLOYEE_CODE: "employee_code",
  STATUS: "status",
  START_DATE: "start_date",
  END_DATE: "end_date",
  IP_ADDRESS: "ip_address",
  INCLUDE_PAYROLL: "include_payroll",
  INCLUDE_INACTIVE: "include_inactive",
  UNSIGNED_ONLY: "unsigned_only",
  IMPORT_TYPE: "import_type",
  DATE_FROM: "date_from",
  DATE_TO: "date_to",
} as const;
