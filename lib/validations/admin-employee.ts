import { z } from "zod";
import { EmployeeIdSchema, DepartmentSchema, RoleSchema } from "./common";

const CCCD_REGEX = /^\d{12}$/;

export const EmployeeCreateRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  full_name: z.string().trim().min(2, { message: "Họ tên phải có ít nhất 2 ký tự" }).max(100, { message: "Họ tên không được quá 100 ký tự" }),
  cccd: z.string().regex(CCCD_REGEX, { message: "CCCD phải có đúng 12 chữ số" }),
  chuc_vu: RoleSchema,
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" }).max(100).optional(),
  department: DepartmentSchema.optional(),
  phone_number: z.string().max(20, { message: "Số điện thoại không được quá 20 ký tự" }).optional(),
  is_active: z.boolean().optional().default(true),
});

export type EmployeeCreateRequest = z.infer<typeof EmployeeCreateRequestSchema>;

export const EmployeeUpdateRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  full_name: z.string().trim().min(2, { message: "Họ tên phải có ít nhất 2 ký tự" }).max(100, { message: "Họ tên không được quá 100 ký tự" }),
  chuc_vu: RoleSchema,
  cccd: z.string().regex(CCCD_REGEX, { message: "CCCD phải có đúng 12 chữ số" }).optional(),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" }).max(100).optional(),
  department: DepartmentSchema.optional(),
  phone_number: z.string().max(20, { message: "Số điện thoại không được quá 20 ký tự" }).optional(),
  is_active: z.boolean().optional(),
});

export type EmployeeUpdateRequest = z.infer<typeof EmployeeUpdateRequestSchema>;

export const EmployeeListQuerySchema = z.object({
  search: z.string().max(100).optional(),
  department: DepartmentSchema.optional(),
  role: RoleSchema.optional(),
  page: z.coerce.number().int().min(1, { message: "Page phải >= 1" }).default(1),
  limit: z.coerce.number().int().min(1, { message: "Limit phải >= 1" }).max(100, { message: "Limit không được quá 100" }).default(20),
});

export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;
