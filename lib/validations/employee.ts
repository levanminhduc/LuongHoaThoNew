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

const BASE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const T13_MONTH_REGEX = /^\d{4}-(13|T13)$/i;
const NORMAL_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const UpdateSignatureDateRequestSchema = z
  .object({
    salary_month: z.string().trim().min(1, {
      message: "Tháng lương không được để trống",
    }),
    base_date: z.string().regex(BASE_DATE_REGEX, {
      message: "Ngày cơ sở không hợp lệ (YYYY-MM-DD)",
    }),
    random_range_days: z.number().int().min(0).max(30).default(0),
    scope: z.enum(["all", "selected"], {
      message: "Phạm vi không hợp lệ (all hoặc selected)",
    }),
    employee_ids: z.array(z.string()).optional(),
    is_t13: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const monthPattern = value.is_t13 ? T13_MONTH_REGEX : NORMAL_MONTH_REGEX;
    if (!monthPattern.test(value.salary_month)) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_month"],
        message: value.is_t13
          ? "Định dạng tháng không hợp lệ (YYYY-13)"
          : "Định dạng tháng không hợp lệ (YYYY-MM)",
      });
    }

    if (value.scope === "selected" && !value.employee_ids?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["employee_ids"],
        message: "Chưa chọn nhân viên nào",
      });
    }
  });

export type UpdateSignatureDateRequest = z.infer<
  typeof UpdateSignatureDateRequestSchema
>;

export const CheckPasswordStatusRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
});
export type CheckPasswordStatusRequest = z.infer<
  typeof CheckPasswordStatusRequestSchema
>;

export const SalaryHistoryActionRequestSchema = z
  .object({
    action: z.enum(["list_months", "get_payroll"], {
      message: "Hành động không hợp lệ (list_months hoặc get_payroll)",
    }),
    salary_month: SalaryMonthSchema.optional(),
    is_t13: z.boolean().default(false),
    employee_id: EmployeeIdSchema.optional(),
    cccd: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "get_payroll" && !value.salary_month) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_month"],
        message: "Thiếu tháng lương cần xem",
      });
    }
  });

export type SalaryHistoryActionRequest = z.infer<
  typeof SalaryHistoryActionRequestSchema
>;

export const UpdateManagementSignatureDateRequestSchema = z
  .object({
    salary_month: z.string().trim().min(1, {
      message: "Tháng lương không được để trống",
    }),
    signature_type: SignatureTypeSchema,
    new_signed_at: z.string().trim().min(1, {
      message: "Chưa nhập ngày ký mới",
    }),
    action: z.enum(["update", "create"]).default("update"),
    is_t13: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const monthPattern = value.is_t13 ? T13_MONTH_REGEX : NORMAL_MONTH_REGEX;
    if (!monthPattern.test(value.salary_month)) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_month"],
        message: value.is_t13
          ? "Định dạng tháng không hợp lệ (YYYY-13)"
          : "Định dạng tháng không hợp lệ (YYYY-MM)",
      });
    }
  });

export type UpdateManagementSignatureDateRequest = z.infer<
  typeof UpdateManagementSignatureDateRequestSchema
>;

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
