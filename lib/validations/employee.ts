import { z } from "zod";
import {
  EmployeeIdSchema,
  SalaryMonthSchema,
  SalaryMonthNormalSchema,
  DepartmentSchema,
  SignatureTypeSchema,
  NotesSchema,
  DeviceInfoSchema,
  PaginationSchema,
} from "./common";

export const EmployeeSignSalaryRequestSchema = z.object({
  salary_month: SalaryMonthSchema,
  device_info: DeviceInfoSchema,
});

export const EmployeeSalaryHistoryRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  months: z
    .array(SalaryMonthSchema)
    .min(1, { message: "Phải chọn ít nhất một tháng" })
    .max(12, { message: "Không thể chọn quá 12 tháng" }),
});

export const ManagementSignatureRequestSchema = z.object({
  salary_month: SalaryMonthNormalSchema,
  signature_type: SignatureTypeSchema,
  notes: NotesSchema,
  device_info: DeviceInfoSchema,
});

export const BulkSignSalaryRequestSchema = z.object({
  salary_month: SalaryMonthNormalSchema,
  employee_ids: z
    .array(EmployeeIdSchema)
    .min(1, { message: "Phải chọn ít nhất một nhân viên" }),
  notes: NotesSchema,
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
