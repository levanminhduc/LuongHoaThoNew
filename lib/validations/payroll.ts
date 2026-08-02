import { z } from "zod";
import {
  EmployeeIdSchema,
  SalaryMonthSchema,
  DepartmentSchema,
  ImportStrategySchema,
  WorkHoursSchema,
  PaginationSchema,
  pageQuerySchema,
} from "./common";

export const PayrollImportRowSchema = z.object({
  employee_id: EmployeeIdSchema,
  salary_month: SalaryMonthSchema,
  department: DepartmentSchema.optional(),
  work_hours: WorkHoursSchema.optional(),
  base_salary: z.coerce.number().min(0).optional(),
  allowances: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  net_salary: z.coerce.number().min(0).optional(),
});

export const PayrollImportRequestSchema = z.object({
  salary_month: SalaryMonthSchema,
  strategy: ImportStrategySchema.optional().default("skip"),
  rows: z
    .array(PayrollImportRowSchema)
    .min(1, { message: "Phải có ít nhất một dòng dữ liệu" }),
});

export const PayrollQuerySchema = z
  .object({
    salary_month: SalaryMonthSchema.optional(),
    employee_id: EmployeeIdSchema.optional(),
    department: DepartmentSchema.optional(),
  })
  .merge(PaginationSchema);

export const DataValidationRequestSchema = z.object({
  salary_month: SalaryMonthSchema,
  employee_ids: z.array(EmployeeIdSchema).optional(),
  check_duplicates: z.boolean().optional().default(true),
  check_calculations: z.boolean().optional().default(true),
  tolerance: z.coerce.number().min(0).max(100).optional().default(10),
});

export const ImportHistoryCreateSchema = z.object({
  file_name: z
    .string()
    .trim()
    .min(1, { message: "Tên file không được để trống" })
    .max(255, { message: "Tên file không được quá 255 ký tự" }),
  file_type: z.enum(["file1", "file2"], {
    message: "Loại file phải là file1 hoặc file2",
  }),
  salary_month: SalaryMonthSchema,
  total_records: z.coerce.number().int().min(0),
  success_count: z.coerce.number().int().min(0),
  error_count: z.coerce.number().int().min(0),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
});

export const AdvancedUploadRequestSchema = z.object({
  payrollData: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, { message: "Dữ liệu không hợp lệ" }),
  columnMappings: z.record(z.string(), z.unknown()).optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
});
export type AdvancedUploadRequest = z.infer<typeof AdvancedUploadRequestSchema>;

export const ImportErrorItemSchema = z.object({
  row: z.coerce.number().int(),
  column: z.string().optional(),
  field: z.string().optional(),
  value: z.unknown().optional(),
  employee_id: z.string().optional(),
  salary_month: z.string().optional(),
  errorType: z.enum([
    "validation",
    "format",
    "duplicate",
    "database",
    "system",
    "employee_not_found",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  suggestion: z.string().optional(),
  expectedFormat: z.string().optional(),
  currentValue: z.string().optional(),
  originalData: z.record(z.string(), z.unknown()).optional(),
});
export type ImportErrorItem = z.infer<typeof ImportErrorItemSchema>;

export const ImportErrorExportRequestSchema = z.object({
  errors: z
    .array(ImportErrorItemSchema)
    .min(1, { message: "Không có lỗi nào để xuất" }),
  originalData: z.array(z.record(z.string(), z.unknown())).optional(),
  fileName: z.string().trim().max(255).default("import_errors"),
  format: z.enum(["excel", "csv"]).default("excel"),
  includeOriginalData: z.boolean().default(true),
  originalHeaders: z.array(z.string()).default([]),
});
export type ImportErrorExportRequest = z.infer<
  typeof ImportErrorExportRequestSchema
>;

export const PayrollAuditFilterRequestSchema = z.object({
  startDate: z
    .string()
    .trim()
    .min(1, { message: "Ngày bắt đầu không hợp lệ" })
    .optional(),
  endDate: z
    .string()
    .trim()
    .min(1, { message: "Ngày kết thúc không hợp lệ" })
    .optional(),
  employeeId: EmployeeIdSchema.optional(),
});
export type PayrollAuditFilterRequest = z.infer<
  typeof PayrollAuditFilterRequestSchema
>;

export const BulkPayrollExportRequestSchema = z.object({
  departments: z.array(DepartmentSchema).min(1, {
    message: "Phai chon it nhat mot phong ban",
  }),
  salary_month: SalaryMonthSchema,
  payroll_type: z.enum(["monthly", "t13"]).default("monthly"),
});

export const PeriodExportRequestSchema = z.object({
  period_year: z.number().int().min(2020).max(2100),
  period_month: z.number().int().min(1).max(12),
});

export const YearlySummaryRequestSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export const DepartmentStatsRequestSchema = z.object({
  month: SalaryMonthSchema.optional(),
});

export type YearlySummaryRequest = z.infer<typeof YearlySummaryRequestSchema>;
export type DepartmentStatsRequest = z.infer<
  typeof DepartmentStatsRequestSchema
>;

export const DualFilesImportMetaSchema = z
  .object({
    has_file1: z.boolean(),
    has_file2: z.boolean(),
    file1Mappings: z.string().optional(),
    file2Mappings: z.string().optional(),
  })
  .refine((d) => d.has_file1 || d.has_file2, {
    message: "Can it nhat 1 file (file1 hoac file2)",
  })
  .refine(
    (d) => !d.has_file1 || (d.file1Mappings && d.file1Mappings.length > 0),
    {
      message: "file1Mappings bat buoc khi co file1",
      path: ["file1Mappings"],
    },
  )
  .refine(
    (d) => !d.has_file2 || (d.file2Mappings && d.file2Mappings.length > 0),
    {
      message: "file2Mappings bat buoc khi co file2",
      path: ["file2Mappings"],
    },
  );

const ConfidenceScoreSchema = z
  .number()
  .int()
  .min(0, { message: "Confidence score phải từ 0 đến 100" })
  .max(100, { message: "Confidence score phải từ 0 đến 100" });

export const ColumnAliasCreateRequestSchema = z.object({
  database_field: z
    .string()
    .trim()
    .min(1, { message: "Thiếu thông tin database_field" }),
  alias_name: z
    .string()
    .trim()
    .min(1, { message: "Thiếu thông tin alias_name" }),
  confidence_score: ConfidenceScoreSchema.default(80),
  config_id: z.coerce
    .number()
    .int()
    .positive({ message: "config_id không hợp lệ" })
    .nullish(),
});
export type ColumnAliasCreateRequest = z.infer<
  typeof ColumnAliasCreateRequestSchema
>;

const OptionalBooleanFlagSchema = z
  .enum(["true", "false"])
  .nullish()
  .transform((value) => (value == null ? undefined : value === "true"));

export const ColumnAliasListQuerySchema = pageQuerySchema(50).extend({
  database_field: z.string().trim().nullish(),
  alias_name: z.string().trim().nullish(),
  created_by: z.string().trim().nullish(),
  is_active: OptionalBooleanFlagSchema,
  confidence_min: ConfidenceScoreSchema.nullish(),
  confidence_max: ConfidenceScoreSchema.nullish(),
  sort_by: z
    .enum(["alias_name", "confidence_score", "created_at"])
    .nullish()
    .transform((value) => value ?? "alias_name"),
  sort_order: z
    .enum(["asc", "desc"])
    .nullish()
    .transform((value) => value ?? "asc"),
});
export type ColumnAliasListQuery = z.infer<typeof ColumnAliasListQuerySchema>;

export const MappingConfigurationListQuerySchema = pageQuerySchema(20).extend({
  config_name: z.string().trim().nullish(),
  created_by: z.string().trim().nullish(),
  is_active: OptionalBooleanFlagSchema,
  is_default: OptionalBooleanFlagSchema,
});
export type MappingConfigurationListQuery = z.infer<
  typeof MappingConfigurationListQuerySchema
>;

export const ColumnAliasBulkRequestSchema = z.object({
  aliases: z
    .array(ColumnAliasCreateRequestSchema)
    .min(1, { message: "Danh sách aliases không hợp lệ" }),
});
export type ColumnAliasBulkRequest = z.infer<
  typeof ColumnAliasBulkRequestSchema
>;

export const ColumnAliasUpdateRequestSchema = z.object({
  alias_name: z
    .string()
    .trim()
    .min(1, { message: "Thiếu thông tin alias_name" }),
  confidence_score: ConfidenceScoreSchema.optional(),
  is_active: z.boolean().optional(),
});
export type ColumnAliasUpdateRequest = z.infer<
  typeof ColumnAliasUpdateRequestSchema
>;

export const FieldMappingSchema = z.object({
  database_field: z.string().trim().min(1),
  excel_column_name: z.string().trim().min(1),
  confidence_score: ConfidenceScoreSchema.optional(),
  mapping_type: z.enum(["exact", "alias", "fuzzy", "manual"]).optional(),
  validation_passed: z.boolean().optional(),
});

export const MappingConfigurationCreateRequestSchema = z.object({
  config_name: z.string().trim().min(1, { message: "Thiếu tên cấu hình" }),
  description: z.string().trim().max(500).optional(),
  field_mappings: z.array(FieldMappingSchema).default([]),
  is_default: z.boolean().default(false),
});
export type MappingConfigurationCreateRequest = z.infer<
  typeof MappingConfigurationCreateRequestSchema
>;

export const MappingConfigurationSaveRequestSchema = z.object({
  mapping: z
    .record(z.string(), z.unknown())
    .refine((value) => Object.keys(value).length > 0, {
      message: "Thiếu thông tin mapping",
    }),
  file_name: z.string().trim().optional(),
  auto_generate_name: z.boolean().default(true),
});
export type MappingConfigurationSaveRequest = z.infer<
  typeof MappingConfigurationSaveRequestSchema
>;

export const PayrollUpdateRequestSchema = z.object({
  updates: z
    .record(z.string(), z.unknown())
    .refine((value) => Object.keys(value).length > 0, {
      message: "Chưa có trường nào cần cập nhật",
    }),
  changeReason: z
    .string()
    .trim()
    .min(1, { message: "Vui lòng nhập lý do thay đổi" })
    .max(500, { message: "Lý do thay đổi không được quá 500 ký tự" }),
});

export type PayrollUpdateRequest = z.infer<typeof PayrollUpdateRequestSchema>;

export type PayrollImportRow = z.infer<typeof PayrollImportRowSchema>;
export type PayrollImportRequest = z.infer<typeof PayrollImportRequestSchema>;
export type PayrollQuery = z.infer<typeof PayrollQuerySchema>;
export type DataValidationRequest = z.infer<typeof DataValidationRequestSchema>;
export type ImportHistoryCreate = z.infer<typeof ImportHistoryCreateSchema>;
export type BulkPayrollExportRequest = z.infer<
  typeof BulkPayrollExportRequestSchema
>;
export type PeriodExportRequest = z.infer<typeof PeriodExportRequestSchema>;
export type DualFilesImportMeta = z.infer<typeof DualFilesImportMetaSchema>;
