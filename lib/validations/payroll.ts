import { z } from "zod";
import {
  EmployeeIdSchema,
  SalaryMonthSchema,
  DepartmentSchema,
  ImportStrategySchema,
  WorkHoursSchema,
  PaginationSchema,
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
