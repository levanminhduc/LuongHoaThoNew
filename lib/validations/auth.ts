import { z } from "zod";

export const AdminLoginRequestSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  employee_code: z.string().min(1).max(50),
  cccd: z.string().min(9).max(20),
  new_password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ChangePasswordWithCccdRequestSchema = ForgotPasswordRequestSchema;
export type ChangePasswordWithCccdRequest = z.infer<
  typeof ChangePasswordWithCccdRequestSchema
>;

export const EmployeeChangePasswordRequestSchema = z.object({
  employee_id: z.string().min(1).max(50),
  current_password: z.string().min(1).max(200),
  new_password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
});
export type EmployeeChangePasswordRequest = z.infer<
  typeof EmployeeChangePasswordRequestSchema
>;
