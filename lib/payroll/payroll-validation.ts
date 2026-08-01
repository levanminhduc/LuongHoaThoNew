/**
 * Enhanced Payroll Data Validation System
 * Provides comprehensive validation including business logic and cross-field validation
 */

import { ApiErrorHandler, type ApiError } from "./api-error-handler";

export interface ValidationResult {
  isValid: boolean;
  errors: ApiError[];
  warnings: ApiError[];
  autoFixes: AutoFix[];
}

export interface AutoFix {
  field: string;
  originalValue: unknown;
  fixedValue: unknown;
  reason: string;
  confidence: "high" | "medium" | "low";
}

export interface PayrollValidationContext {
  employee_id: string;
  salary_month: string;
  row?: number;
  file_type?: "file1" | "file2";
}

export class PayrollValidator {
  /**
   * Validate complete payroll record
   */
  static validatePayrollRecord(
    data: Record<string, unknown>,
    context: PayrollValidationContext,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      autoFixes: [],
    };

    // Required field validation
    this.validateRequiredFields(data, context, result);

    // Data type validation
    this.validateDataTypes(data, context, result);

    // Business logic validation
    this.validateBusinessLogic(data, context, result);

    // Cross-field validation
    this.validateCrossFields(data, context, result);

    // Range validation
    this.validateRanges(data, context, result);

    // Format validation
    this.validateFormats(data, context, result);

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate required fields
   */
  private static validateRequiredFields(
    data: Record<string, unknown>,
    context: PayrollValidationContext,
    result: ValidationResult,
  ): void {
    const requiredFields = ["employee_id", "salary_month"];

    requiredFields.forEach((field) => {
      if (!data[field] || String(data[field]).trim() === "") {
        result.errors.push(
          ApiErrorHandler.createValidationError(
            field,
            `Trường ${field} là bắt buộc`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    });
  }

  /**
   * Validate data types
   */
  private static validateDataTypes(
    data: Record<string, unknown>,
    context: PayrollValidationContext,
    result: ValidationResult,
  ): void {
    const numericFields = [
      "he_so_lam_viec",
      "he_so_phu_cap_ket_qua",
      "he_so_luong_co_ban",
      "luong_toi_thieu_cty",
      "so_gio_lam_viec_thuc_te",
      "so_gio_lam_viec_quy_dinh",
      "so_ngay_lam_viec_thuc_te",
      "so_ngay_lam_viec_quy_dinh",
      "luong_san_pham",
      "luong_co_ban",
      "phu_cap_ket_qua",
      "phu_cap_vuot_gio",
      "phu_cap_ca_dem",
      "phu_cap_chu_nhat",
      "phu_cap_le_tet",
      "phu_cap_khac",
      "thuong_hieu_qua_lam_viec",
      "thuong_khac",
      "tien_luong_thuc_nhan_cuoi_ky",
      "chi_dot_1_13",
      "chi_dot_2_13",
      "tong_luong_13",
      "so_thang_chia_13",
      "tong_sp_12_thang",
      "t13_thang_01",
      "t13_thang_02",
      "t13_thang_03",
      "t13_thang_04",
      "t13_thang_05",
      "t13_thang_06",
      "t13_thang_07",
      "t13_thang_08",
      "t13_thang_09",
      "t13_thang_10",
      "t13_thang_11",
      "t13_thang_12",
    ];

    numericFields.forEach((field) => {
      if (
        data[field] !== undefined &&
        data[field] !== null &&
        data[field] !== ""
      ) {
        const value = Number(data[field]);
        if (isNaN(value)) {
          // Try to auto-fix common issues
          const cleanedValue = this.tryAutoFixNumeric(data[field]);
          if (cleanedValue !== null) {
            result.autoFixes.push({
              field,
              originalValue: data[field],
              fixedValue: cleanedValue,
              reason: "Tự động chuyển đổi định dạng số",
              confidence: "high",
            });
            data[field] = cleanedValue;
          } else {
            result.errors.push(
              ApiErrorHandler.createValidationError(
                field,
                `Trường ${field} phải là số hợp lệ`,
                context.row,
                context.employee_id,
                context.salary_month,
                context.file_type,
              ),
            );
          }
        }
      }
    });
  }

  /**
   * Validate business logic rules
   */
  private static validateBusinessLogic(
    data: Record<string, unknown>,
    context: PayrollValidationContext,
    result: ValidationResult,
  ): void {
    // Validate salary month format (YYYY-MM)
    if (data.salary_month) {
      const salaryMonth = String(data.salary_month);
      const monthPattern = /^\d{4}-\d{2}$/;
      if (!monthPattern.test(salaryMonth)) {
        result.errors.push(
          ApiErrorHandler.createValidationError(
            "salary_month",
            "Tháng lương phải có định dạng YYYY-MM (ví dụ: 2024-01)",
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      } else {
        // Validate month range
        const [year, month] = salaryMonth.split("-").map(Number);
        if (month < 1 || month > 12) {
          result.errors.push(
            ApiErrorHandler.createValidationError(
              "salary_month",
              "Tháng phải từ 01 đến 12",
              context.row,
              context.employee_id,
              context.salary_month,
              context.file_type,
            ),
          );
        }

        // Validate year range
        const currentYear = new Date().getFullYear();
        if (year < 2020 || year > currentYear + 1) {
          result.warnings.push(
            ApiErrorHandler.createValidationError(
              "salary_month",
              `Năm ${year} có vẻ không hợp lý (nên từ 2020 đến ${currentYear + 1})`,
              context.row,
              context.employee_id,
              context.salary_month,
              context.file_type,
            ),
          );
        }
      }
    }

    // Validate employee ID format
    if (data.employee_id) {
      const employeeId = String(data.employee_id);
      const empIdPattern = /^[A-Z0-9]{3,20}$/;
      if (!empIdPattern.test(employeeId)) {
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "employee_id",
            "Mã nhân viên nên chỉ chứa chữ cái viết hoa và số, độ dài 3-20 ký tự",
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }

    // Validate working hours logic
    if (data.so_gio_lam_viec_thuc_te && data.so_gio_lam_viec_quy_dinh) {
      const actualHours = Number(data.so_gio_lam_viec_thuc_te);
      const standardHours = Number(data.so_gio_lam_viec_quy_dinh);

      if (actualHours > standardHours * 2) {
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "so_gio_lam_viec_thuc_te",
            `Giờ làm việc thực tế (${actualHours}) cao bất thường so với quy định (${standardHours})`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }

    // Validate working days logic
    if (data.so_ngay_lam_viec_thuc_te && data.so_ngay_lam_viec_quy_dinh) {
      const actualDays = Number(data.so_ngay_lam_viec_thuc_te);
      const standardDays = Number(data.so_ngay_lam_viec_quy_dinh);

      if (actualDays > 31) {
        result.errors.push(
          ApiErrorHandler.createValidationError(
            "so_ngay_lam_viec_thuc_te",
            "Số ngày làm việc thực tế không thể vượt quá 31 ngày",
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }

      if (actualDays > standardDays * 1.5) {
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "so_ngay_lam_viec_thuc_te",
            `Ngày làm việc thực tế (${actualDays}) cao bất thường so với quy định (${standardDays})`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }
  }

  /**
   * Validate cross-field relationships
   */
  private static validateCrossFields(
    data: Record<string, unknown>,
    context: PayrollValidationContext,
    result: ValidationResult,
  ): void {
    // Validate salary calculation consistency
    const basicSalary = Number(data.luong_co_ban) || 0;
    const productSalary = Number(data.luong_san_pham) || 0;
    const allowances = [
      "phu_cap_ket_qua",
      "phu_cap_vuot_gio",
      "phu_cap_ca_dem",
      "phu_cap_chu_nhat",
      "phu_cap_le_tet",
      "phu_cap_khac",
    ].reduce((sum, field) => sum + (Number(data[field]) || 0), 0);

    const bonuses = ["thuong_hieu_qua_lam_viec", "thuong_khac"].reduce(
      (sum, field) => sum + (Number(data[field]) || 0),
      0,
    );

    const grossSalary = Number(data.tong_luong_truoc_thue) || 0;
    const calculatedGross = basicSalary + productSalary + allowances + bonuses;

    if (
      grossSalary > 0 &&
      Math.abs(grossSalary - calculatedGross) > calculatedGross * 0.1
    ) {
      result.warnings.push(
        ApiErrorHandler.createValidationError(
          "tong_luong_truoc_thue",
          `Tổng lương trước thuế (${grossSalary}) không khớp với tính toán (${calculatedGross})`,
          context.row,
          context.employee_id,
          context.salary_month,
          context.file_type,
        ),
      );
    }

    // Validate deductions vs net salary
    const deductions = [
      "thue_thu_nhap_ca_nhan",
      "bao_hiem_xa_hoi_nv_dong",
      "bao_hiem_y_te_nv_dong",
      "bao_hiem_that_nghiep_nv_dong",
      "kinh_phi_cong_doan_nv_dong",
      "tam_ung_luong",
      "khau_tru_khac",
    ].reduce((sum, field) => sum + (Number(data[field]) || 0), 0);

    const netSalary = Number(data.tien_luong_thuc_nhan_cuoi_ky) || 0;
    const calculatedNet = grossSalary - deductions;

    if (
      netSalary > 0 &&
      grossSalary > 0 &&
      Math.abs(netSalary - calculatedNet) > calculatedNet * 0.1
    ) {
      result.warnings.push(
        ApiErrorHandler.createValidationError(
          "tien_luong_thuc_nhan_cuoi_ky",
          `Lương thực nhận (${netSalary}) không khớp với tính toán (${calculatedNet})`,
          context.row,
          context.employee_id,
          context.salary_month,
          context.file_type,
        ),
      );
    }

    // Validate T13 calculation consistency
    const chiDot1 = Number(data.chi_dot_1_13) || 0;
    const chiDot2 = Number(data.chi_dot_2_13) || 0;
    const tongLuong13 = Number(data.tong_luong_13) || 0;

    if (tongLuong13 > 0 && (chiDot1 > 0 || chiDot2 > 0)) {
      const calculatedTotal = chiDot1 + chiDot2;
      if (Math.abs(tongLuong13 - calculatedTotal) > calculatedTotal * 0.01) {
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "tong_luong_13",
            `Tổng lương tháng 13 (${tongLuong13.toLocaleString()}) không khớp với tổng chi đợt 1 + đợt 2 (${calculatedTotal.toLocaleString()})`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }

    // Validate T13 monthly details sum
    const monthlyT13Fields = [
      "t13_thang_01",
      "t13_thang_02",
      "t13_thang_03",
      "t13_thang_04",
      "t13_thang_05",
      "t13_thang_06",
      "t13_thang_07",
      "t13_thang_08",
      "t13_thang_09",
      "t13_thang_10",
      "t13_thang_11",
      "t13_thang_12",
    ];

    const totalMonthlyT13 = monthlyT13Fields.reduce(
      (sum, field) => sum + (Number(data[field]) || 0),
      0,
    );

    const tongSp12Thang = Number(data.tong_sp_12_thang) || 0;

    if (tongSp12Thang > 0 && totalMonthlyT13 > 0) {
      if (Math.abs(tongSp12Thang - totalMonthlyT13) > totalMonthlyT13 * 0.01) {
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "tong_sp_12_thang",
            `Tổng SP 12 tháng (${tongSp12Thang.toLocaleString()}) không khớp với tổng chi tiết các tháng (${totalMonthlyT13.toLocaleString()})`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }
  }

  /**
   * Validate value ranges
   */
  private static validateRanges(
    data: Record<string, unknown>,
    context: PayrollValidationContext,
    result: ValidationResult,
  ): void {
    // Validate negative values that shouldn't be negative
    const shouldBePositive = [
      "he_so_lam_viec",
      "he_so_phu_cap_ket_qua",
      "he_so_luong_co_ban",
      "so_gio_lam_viec_thuc_te",
      "so_ngay_lam_viec_thuc_te",
      "chi_dot_1_13",
      "chi_dot_2_13",
      "tong_luong_13",
      "so_thang_chia_13",
      "tong_sp_12_thang",
      "t13_thang_01",
      "t13_thang_02",
      "t13_thang_03",
      "t13_thang_04",
      "t13_thang_05",
      "t13_thang_06",
      "t13_thang_07",
      "t13_thang_08",
      "t13_thang_09",
      "t13_thang_10",
      "t13_thang_11",
      "t13_thang_12",
    ];

    shouldBePositive.forEach((field) => {
      if (data[field] !== undefined && Number(data[field]) < 0) {
        result.errors.push(
          ApiErrorHandler.createValidationError(
            field,
            `Trường ${field} không thể có giá trị âm`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    });

    // Validate reasonable salary ranges
    const netSalary = Number(data.tien_luong_thuc_nhan_cuoi_ky) || 0;
    if (netSalary > 0) {
      if (netSalary < 1000000) {
        // Less than 1M VND
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "tien_luong_thuc_nhan_cuoi_ky",
            `Lương thực nhận (${netSalary.toLocaleString()} VND) có vẻ thấp`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      } else if (netSalary > 100000000) {
        // More than 100M VND
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "tien_luong_thuc_nhan_cuoi_ky",
            `Lương thực nhận (${netSalary.toLocaleString()} VND) có vẻ cao bất thường`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }

    // Validate T13 specific ranges
    const soThangChia = Number(data.so_thang_chia_13) || 0;
    if (soThangChia > 0 && (soThangChia < 1 || soThangChia > 12)) {
      result.errors.push(
        ApiErrorHandler.createValidationError(
          "so_thang_chia_13",
          `Số tháng chia phải từ 1 đến 12 (giá trị hiện tại: ${soThangChia})`,
          context.row,
          context.employee_id,
          context.salary_month,
          context.file_type,
        ),
      );
    }

    // Validate T13 reasonable amount
    const tongLuong13 = Number(data.tong_luong_13) || 0;
    if (tongLuong13 > 0) {
      if (tongLuong13 > 200000000) {
        // More than 200M VND
        result.warnings.push(
          ApiErrorHandler.createValidationError(
            "tong_luong_13",
            `Tổng lương tháng 13 (${tongLuong13.toLocaleString()} VND) có vẻ cao bất thường`,
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }
  }

  /**
   * Validate formats
   */
  private static validateFormats(
    data: Record<string, unknown>,
    context: PayrollValidationContext,
    result: ValidationResult,
  ): void {
    // Validate CCCD format if provided
    if (data.cccd) {
      const cccdPattern = /^\d{12}$/;
      if (!cccdPattern.test(String(data.cccd))) {
        result.errors.push(
          ApiErrorHandler.createValidationError(
            "cccd",
            "CCCD phải có đúng 12 chữ số",
            context.row,
            context.employee_id,
            context.salary_month,
            context.file_type,
          ),
        );
      }
    }
  }

  /**
   * Try to auto-fix numeric values
   */
  private static tryAutoFixNumeric(value: unknown): number | null {
    if (typeof value === "number") return value;

    const stringValue = String(value).trim();

    // Remove common formatting
    const cleaned = stringValue
      .replace(/[,\s]/g, "") // Remove commas and spaces
      .replace(/[^\d.-]/g, ""); // Keep only digits, dots, and minus

    const parsed = Number(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
}
