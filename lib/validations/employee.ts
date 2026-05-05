import { z } from "zod";
import {
  EmployeeIdSchema,
  SalaryMonthSchema,
  DepartmentSchema,
  SignatureTypeSchema,
  NotesSchema,
  DeviceInfoSchema,
  PaginationSchema,
} from "./common";

export const EmployeeSignSalaryRequestSchema = z.object({
  salary_month: SalaryMonthSchema,
  is_t13: z.boolean().optional(),
  employee_id: z.string().trim().min(1).max(50).optional(),
  cccd: z.string().trim().min(9).max(20).optional(),
});

export const EmployeeLookupRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  cccd: z
    .string()
    .trim()
    .min(1, { message: "Mật khẩu / CCCD không được để trống" })
    .max(255, { message: "Mật khẩu / CCCD không được quá 255 ký tự" }),
  is_t13: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "string") {
        return ["1", "true", "on", "yes"].includes(value.toLowerCase());
      }
      return value;
    }, z.boolean())
    .optional()
    .default(false),
});

export const EmployeeSalaryHistoryRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  months: z
    .array(SalaryMonthSchema)
    .min(1, { message: "Phải chọn ít nhất một tháng" })
    .max(12, { message: "Không thể chọn quá 12 tháng" }),
});

export const ManagementSignatureRequestSchema = z.object({
  salary_month: SalaryMonthSchema,
  signature_type: SignatureTypeSchema,
  notes: NotesSchema,
  device_info: DeviceInfoSchema,
  is_t13: z.boolean().optional(),
});

export const BulkSignSalaryRequestSchema = z.object({
  salary_month: SalaryMonthSchema,
  admin_note: z.string().max(500).optional(),
  batch_size: z.number().int().min(1).max(1000).optional(),
  is_t13: z.boolean().optional(),
});

export const SignatureStatusParamsSchema = z.object({
  month: SalaryMonthSchema,
});

export const SignatureHistoryQuerySchema = z
  .object({
    months: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return [];
        return val.split(",").map((m) => m.trim());
      }),
    signature_type: SignatureTypeSchema.optional(),
  })
  .merge(PaginationSchema);

export const EmployeeAccessSchema = z.object({
  employee_id: EmployeeIdSchema,
  department: DepartmentSchema.optional(),
});

export type EmployeeSignSalaryRequest = z.infer<
  typeof EmployeeSignSalaryRequestSchema
>;
export type EmployeeLookupRequest = z.infer<typeof EmployeeLookupRequestSchema>;
export type EmployeeSalaryHistoryRequest = z.infer<
  typeof EmployeeSalaryHistoryRequestSchema
>;
export type ManagementSignatureRequest = z.infer<
  typeof ManagementSignatureRequestSchema
>;
export type BulkSignSalaryRequest = z.infer<typeof BulkSignSalaryRequestSchema>;
export type SignatureStatusParams = z.infer<typeof SignatureStatusParamsSchema>;
export type SignatureHistoryQuery = z.infer<typeof SignatureHistoryQuerySchema>;
export type EmployeeAccess = z.infer<typeof EmployeeAccessSchema>;
