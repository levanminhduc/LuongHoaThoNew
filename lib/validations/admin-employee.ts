import { z } from "zod";
import {
  EmployeeIdSchema,
  DepartmentSchema,
  RoleSchema,
  NotesSchema,
  SalaryMonthSchema,
} from "./common";

const CCCD_REGEX = /^\d{12}$/;

export const EmployeeCreateRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Họ tên phải có ít nhất 2 ký tự" })
    .max(100, { message: "Họ tên không được quá 100 ký tự" }),
  cccd: z
    .string()
    .regex(CCCD_REGEX, { message: "CCCD phải có đúng 12 chữ số" }),
  chuc_vu: RoleSchema,
  password: z
    .string()
    .min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
    .max(100)
    .optional(),
  department: DepartmentSchema.optional(),
  phone_number: z
    .string()
    .max(20, { message: "Số điện thoại không được quá 20 ký tự" })
    .optional(),
  is_active: z.boolean().optional().default(true),
});

export type EmployeeCreateRequest = z.infer<typeof EmployeeCreateRequestSchema>;

export const EmployeeUpdateRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Họ tên phải có ít nhất 2 ký tự" })
    .max(100, { message: "Họ tên không được quá 100 ký tự" }),
  chuc_vu: RoleSchema,
  cccd: z
    .string()
    .regex(CCCD_REGEX, { message: "CCCD phải có đúng 12 chữ số" })
    .optional(),
  password: z
    .string()
    .min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
    .max(100)
    .optional(),
  department: DepartmentSchema.optional(),
  phone_number: z
    .string()
    .max(20, { message: "Số điện thoại không được quá 20 ký tự" })
    .optional(),
  is_active: z.boolean().optional(),
});

export type EmployeeUpdateRequest = z.infer<typeof EmployeeUpdateRequestSchema>;

export const EmployeeListQuerySchema = z.object({
  search: z.string().max(100).optional(),
  department: DepartmentSchema.optional(),
  role: RoleSchema.optional(),
  page: z.coerce
    .number()
    .int()
    .min(1, { message: "Page phải >= 1" })
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, { message: "Limit phải >= 1" })
    .max(100, { message: "Limit không được quá 100" })
    .default(20),
});

export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;

export const DepartmentPermissionGrantSchema = z.object({
  employee_id: EmployeeIdSchema,
  department: DepartmentSchema,
  notes: NotesSchema,
});
export type DepartmentPermissionGrant = z.infer<
  typeof DepartmentPermissionGrantSchema
>;

export const DepartmentPermissionRevokeSchema = z
  .object({
    id: z.coerce
      .number()
      .int()
      .positive({ message: "Permission ID phải là số dương" })
      .optional(),
    employee_id: EmployeeIdSchema.optional(),
    department: DepartmentSchema.optional(),
  })
  .refine(
    (data) =>
      data.id !== undefined ||
      (data.employee_id !== undefined && data.department !== undefined),
    { message: "Cần cung cấp permission ID hoặc employee_id + department" },
  );
export type DepartmentPermissionRevoke = z.infer<
  typeof DepartmentPermissionRevokeSchema
>;

export const DepartmentPermissionListQuerySchema = z.object({
  employee_id: EmployeeIdSchema.optional(),
  department: DepartmentSchema.optional(),
  is_active: z.enum(["true", "false"]).optional(),
});
export type DepartmentPermissionListQuery = z.infer<
  typeof DepartmentPermissionListQuerySchema
>;

export const DashboardStatsQuerySchema = z.object({
  payroll_type: z.enum(["monthly", "t13"]).default("monthly"),
});
export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;

export const PayrollSearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  salary_month: SalaryMonthSchema.optional(),
  payroll_type: z.enum(["monthly", "t13"]).default("monthly"),
});
export type PayrollSearchQuery = z.infer<typeof PayrollSearchQuerySchema>;

export const BulkSignatureHistoryQuerySchema = z.object({
  month: SalaryMonthSchema.optional(),
  payroll_type: z.enum(["monthly", "t13"]).default("monthly"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type BulkSignatureHistoryQuery = z.infer<
  typeof BulkSignatureHistoryQuerySchema
>;
