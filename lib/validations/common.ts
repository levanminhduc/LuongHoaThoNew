import { z } from "zod";

export const ROLES = [
  "admin",
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
  "truong_phong",
  "to_truong",
  "van_phong",
  "nhan_vien",
] as const;

export const SIGNATURE_TYPES = [
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
] as const;

export const IMPORT_STRATEGIES = ["skip", "overwrite", "merge"] as const;

export const RoleSchema = z.enum(ROLES, {
  message: "Vai trò không hợp lệ",
});

export const SignatureTypeSchema = z.enum(SIGNATURE_TYPES, {
  message: "Loại chữ ký không hợp lệ",
});

export const ImportStrategySchema = z.enum(IMPORT_STRATEGIES, {
  message: "Chiến lược import không hợp lệ (skip, overwrite, merge)",
});

export const EmployeeIdSchema = z
  .string()
  .trim()
  .min(1, { message: "Mã nhân viên không được để trống" })
  .max(50, { message: "Mã nhân viên không được quá 50 ký tự" });

const SALARY_MONTH_NORMAL_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const SALARY_MONTH_T13_REGEX = /^\d{4}-(13|T13)$/i;

export const SalaryMonthSchema = z
  .string()
  .trim()
  .refine(
    (val) =>
      SALARY_MONTH_NORMAL_REGEX.test(val) || SALARY_MONTH_T13_REGEX.test(val),
    {
      message: "Định dạng tháng không hợp lệ (YYYY-MM hoặc YYYY-13/T13)",
    },
  );

export const SalaryMonthNormalSchema = z
  .string()
  .regex(SALARY_MONTH_NORMAL_REGEX, {
    message: "Định dạng tháng không hợp lệ (YYYY-MM)",
  });

export const DepartmentSchema = z
  .string()
  .trim()
  .min(1, { message: "Phòng ban không được để trống" })
  .max(100, { message: "Tên phòng ban không được quá 100 ký tự" });

export const PaginationSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, { message: "Limit phải >= 1" })
    .max(100, { message: "Limit không được quá 100" })
    .optional()
    .default(50),
  offset: z.coerce
    .number()
    .int()
    .min(0, { message: "Offset phải >= 0" })
    .optional()
    .default(0),
});

export const IsT13Schema = z.boolean().optional();

export const NotesSchema = z
  .string()
  .max(500, { message: "Ghi chú không được quá 500 ký tự" })
  .optional();

export const DeviceInfoSchema = z
  .string()
  .max(255, { message: "Thông tin thiết bị không được quá 255 ký tự" })
  .optional();

export const WorkHoursSchema = z.coerce
  .number()
  .min(0, { message: "Số giờ làm việc phải >= 0" })
  .max(744, { message: "Số giờ làm việc không được quá 744 giờ/tháng" });

export function isT13Month(salaryMonth: string): boolean {
  return SALARY_MONTH_T13_REGEX.test(salaryMonth);
}

export type Role = z.infer<typeof RoleSchema>;
export type SignatureType = z.infer<typeof SignatureTypeSchema>;
export type ImportStrategy = z.infer<typeof ImportStrategySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
