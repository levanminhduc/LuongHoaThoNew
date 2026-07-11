import { z } from "zod";

export const AdminLoginRequestSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const newPasswordFieldSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(100, "Mật khẩu tối đa 100 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu phải có chữ cái")
  .regex(/[0-9]/, "Mật khẩu phải có số");

export const ForgotPasswordRequestSchema = z.object({
  employee_code: z.string().min(1).max(50),
  cccd: z.string().min(9).max(20),
  new_password: newPasswordFieldSchema,
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ChangePasswordWithCccdRequestSchema = ForgotPasswordRequestSchema;
export type ChangePasswordWithCccdRequest = z.infer<
  typeof ChangePasswordWithCccdRequestSchema
>;

export const EmployeeChangePasswordRequestSchema = z.object({
  employee_id: z.string().min(1).max(50),
  current_password: z.string().min(1).max(200),
  new_password: newPasswordFieldSchema,
});
export type EmployeeChangePasswordRequest = z.infer<
  typeof EmployeeChangePasswordRequestSchema
>;
