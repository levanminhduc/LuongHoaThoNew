import { z } from "zod";

export const SignatureTypeSchema = z.enum(
  ["giam_doc", "ke_toan", "nguoi_lap_bieu"],
  {
    errorMap: () => ({ message: "Loại chữ ký không hợp lệ" }),
  },
);

export const MonthSchema = z.string().regex(/^\d{4}-\d{2}$/, {
  message: "Định dạng tháng không hợp lệ (YYYY-MM)",
});

export const EmployeeIdSchema = z
  .string()
  .min(1, {
    message: "Mã nhân viên không được để trống",
  })
  .max(50, {
    message: "Mã nhân viên không được quá 50 ký tự",
  });

export const ManagementSignatureRequestSchema = z.object({
  salary_month: MonthSchema,
  signature_type: SignatureTypeSchema,
  notes: z
    .string()
    .max(500, {
      message: "Ghi chú không được quá 500 ký tự",
    })
    .optional(),
  device_info: z
    .string()
    .max(255, {
      message: "Thông tin thiết bị không được quá 255 ký tự",
    })
    .optional(),
});

export const SignatureHistoryQuerySchema = z.object({
  months: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      const months = val.split(",");
      months.forEach((month) => {
        if (!/^\d{4}-\d{2}$/.test(month)) {
          throw new Error(`Định dạng tháng không hợp lệ: ${month}`);
        }
      });
      return months;
    }),
  signature_type: SignatureTypeSchema.optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 50;
      const num = parseInt(val);
      if (isNaN(num) || num < 1 || num > 100) {
        throw new Error("Limit phải từ 1 đến 100");
      }
      return num;
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 0;
      const num = parseInt(val);
      if (isNaN(num) || num < 0) {
        throw new Error("Offset phải >= 0");
      }
      return num;
    }),
});

export const SignatureStatusParamsSchema = z.object({
  month: MonthSchema,
});

export const SignatureProgressParamsSchema = z.object({
  month: MonthSchema,
});

export type ManagementSignatureRequest = z.infer<
  typeof ManagementSignatureRequestSchema
>;
export type SignatureHistoryQuery = z.infer<typeof SignatureHistoryQuerySchema>;
export type SignatureStatusParams = z.infer<typeof SignatureStatusParamsSchema>;
export type SignatureProgressParams = z.infer<
  typeof SignatureProgressParamsSchema
>;
export type SignatureType = z.infer<typeof SignatureTypeSchema>;

export function validateManagementSignatureRequest(
  data: unknown,
): ManagementSignatureRequest {
  try {
    return ManagementSignatureRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

export function validateSignatureHistoryQuery(
  query: Record<string, string | undefined>,
): SignatureHistoryQuery {
  try {
    return SignatureHistoryQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

export function validateSignatureStatusParams(
  params: unknown,
): SignatureStatusParams {
  try {
    return SignatureStatusParamsSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

export function validateSignatureProgressParams(
  params: unknown,
): SignatureProgressParams {
  try {
    return SignatureProgressParamsSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

export function validateSignatureType(signatureType: unknown): SignatureType {
  try {
    return SignatureTypeSchema.parse(signatureType);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error("Loại chữ ký không hợp lệ");
    }
    throw error;
  }
}

export function validateMonth(month: unknown): string {
  try {
    return MonthSchema.parse(month);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error("Định dạng tháng không hợp lệ (YYYY-MM)");
    }
    throw error;
  }
}

export function validateEmployeeId(employeeId: unknown): string {
  try {
    return EmployeeIdSchema.parse(employeeId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

export const SIGNATURE_TYPE_ROLES = {
  giam_doc: "giam_doc",
  ke_toan: "ke_toan",
  nguoi_lap_bieu: "nguoi_lap_bieu",
} as const;

export const ALLOWED_SIGNATURE_ROLES = [
  "admin",
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
] as const;

export function isAllowedSignatureRole(
  role: string,
): role is (typeof ALLOWED_SIGNATURE_ROLES)[number] {
  return ALLOWED_SIGNATURE_ROLES.includes(
    role as (typeof ALLOWED_SIGNATURE_ROLES)[number],
  );
}

export function canRoleSignType(
  role: string,
  signatureType: SignatureType,
): boolean {
  if (role === "admin") return true;
  return role === signatureType;
}

export const ERROR_MESSAGES = {
  INVALID_SIGNATURE_TYPE: "Loại chữ ký không hợp lệ",
  INVALID_MONTH_FORMAT: "Định dạng tháng không hợp lệ (YYYY-MM)",
  INVALID_EMPLOYEE_ID: "Mã nhân viên không hợp lệ",
  UNAUTHORIZED_ACCESS: "Không có quyền truy cập",
  UNAUTHORIZED_SIGNATURE: "Không có quyền ký loại này",
  EMPLOYEE_NOT_FOUND: "Nhân viên không tồn tại hoặc đã bị khóa",
  ROLE_MISMATCH: "Chức vụ nhân viên không khớp với loại chữ ký",
  INCOMPLETE_EMPLOYEE_SIGNATURES: "Chưa đủ 100% nhân viên ký tên",
  SIGNATURE_ALREADY_EXISTS: "Đã có chữ ký cho loại này trong tháng",
  INTERNAL_SERVER_ERROR: "Có lỗi xảy ra trong hệ thống",
  VALIDATION_ERROR: "Dữ liệu đầu vào không hợp lệ",
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
