/**
 * HIGH PRECISION FORMATTING UTILITIES
 * Hỗ trợ format và validate số có precision cao (lên đến 10 chữ số thập phân)
 * Cho hệ thống lương MAY HÒA THỌ ĐIỆN BÀN
 */

export interface HighPrecisionConfig {
  maxDecimalPlaces: number;
  maxIntegerDigits: number;
  allowNegative: boolean;
  fieldType: "coefficient" | "time" | "money";
}

export const FIELD_PRECISION_CONFIG: Record<string, HighPrecisionConfig> = {
  // Hệ số - DECIMAL(5,2) - Standard precision
  he_so_lam_viec: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "coefficient",
  },
  he_so_phu_cap_ket_qua: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "coefficient",
  },
  he_so_luong_co_ban: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "coefficient",
  },

  // Thời gian - DECIMAL(5,2) - Standard precision
  ngay_cong_trong_gio: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "time",
  },
  gio_cong_tang_ca: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "time",
  },
  gio_an_ca: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "time",
  },
  tong_gio_lam_viec: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "time",
  },
  ngay_cong_phep_le: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "time",
  },
  ngay_cong_chu_nhat: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 3,
    allowNegative: false,
    fieldType: "time",
  },

  // SPECIAL CASE: Tổng Hệ Số Quy Đổi - DECIMAL(15,2) - Large values allowed
  tong_he_so_quy_doi: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 13, // DECIMAL(15,2) = 13 integer digits + 2 decimal
    allowNegative: false,
    fieldType: "coefficient",
  },

  // Tiền - Precision thấp, giá trị lớn
  default_money: {
    maxDecimalPlaces: 2,
    maxIntegerDigits: 13,
    allowNegative: true,
    fieldType: "money",
  },
};

/**
 * Format số với precision cao cho display
 */
export function formatHighPrecisionNumber(
  value: number | string | null | undefined,
  fieldName?: string,
  options?: {
    maxDecimalPlaces?: number;
    showTrailingZeros?: boolean;
    locale?: string;
  },
): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return "0";
  }

  const config = fieldName ? FIELD_PRECISION_CONFIG[fieldName] : null;
  const maxDecimals =
    options?.maxDecimalPlaces ?? config?.maxDecimalPlaces ?? 10;
  const locale = options?.locale ?? "vi-VN";

  // Format với precision cao
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: options?.showTrailingZeros ? maxDecimals : 0,
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(numValue);

  return formatted;
}

/**
 * Format số cho coefficient fields (hệ số)
 */
export function formatCoefficient(
  value: number | string | null | undefined,
): string {
  return formatHighPrecisionNumber(value, "he_so_lam_viec", {
    maxDecimalPlaces: 10,
    showTrailingZeros: false,
  });
}

/**
 * Format số cho time fields (thời gian)
 */
export function formatTimeValue(
  value: number | string | null | undefined,
): string {
  return formatHighPrecisionNumber(value, "ngay_cong_trong_gio", {
    maxDecimalPlaces: 10,
    showTrailingZeros: false,
  });
}

/**
 * Format tiền tệ (giữ nguyên 2 chữ số thập phân)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
): string {
  if (amount === undefined || amount === null || amount === "") return "0 ₫";

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "0 ₫";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Parse và validate số với precision cao
 */
export function parseHighPrecisionNumber(
  value: string | number,
  fieldName?: string,
): {
  success: boolean;
  value?: number;
  error?: string;
  warnings?: string[];
} {
  if (value === null || value === undefined || value === "") {
    return { success: true, value: 0 };
  }

  const stringValue = String(value).trim();
  const config = fieldName
    ? FIELD_PRECISION_CONFIG[fieldName]
    : FIELD_PRECISION_CONFIG["default_money"];
  const warnings: string[] = [];

  try {
    // Clean value - remove non-numeric characters except decimal separators
    let cleanedValue = stringValue
      .replace(/[^\d.,\-+]/g, "") // Keep only digits, comma, dot, minus, plus
      .replace(/^\+/, ""); // Remove leading +

    // Handle different decimal separator conventions
    if (cleanedValue.includes(",") && cleanedValue.includes(".")) {
      const lastComma = cleanedValue.lastIndexOf(",");
      const lastDot = cleanedValue.lastIndexOf(".");

      if (lastComma > lastDot) {
        // European format: 1.000,50
        cleanedValue = cleanedValue.replace(/\./g, "").replace(",", ".");
      } else {
        // US format: 1,000.50
        cleanedValue = cleanedValue.replace(/,/g, "");
      }
    } else if (cleanedValue.includes(",")) {
      // Only comma - could be thousands separator or decimal
      const commaCount = (cleanedValue.match(/,/g) || []).length;
      const parts = cleanedValue.split(",");

      if (commaCount === 1 && parts[1].length <= config.maxDecimalPlaces) {
        // Decimal separator
        cleanedValue = cleanedValue.replace(",", ".");
      } else {
        // Thousands separator
        cleanedValue = cleanedValue.replace(/,/g, "");
      }
    }

    // Handle percentage values
    if (stringValue.includes("%")) {
      const percentValue = parseFloat(cleanedValue);
      if (!isNaN(percentValue)) {
        cleanedValue = (percentValue / 100).toString();
        warnings.push("Converted percentage to decimal");
      }
    }

    // Parse final value
    const parsed = parseFloat(cleanedValue);
    if (isNaN(parsed)) {
      return {
        success: false,
        error: `Cannot convert '${value}' to number`,
      };
    }

    // Validate negative values
    if (!config.allowNegative && parsed < 0) {
      return {
        success: false,
        error: `Negative values not allowed for ${fieldName || "this field"}`,
      };
    }

    // Validate integer digits
    const integerPart = Math.floor(Math.abs(parsed)).toString();
    if (integerPart.length > config.maxIntegerDigits) {
      return {
        success: false,
        error: `Value too large. Maximum ${config.maxIntegerDigits} integer digits allowed`,
      };
    }

    // Validate decimal places
    const decimalPart = cleanedValue.split(".")[1] || "";
    if (decimalPart.length > config.maxDecimalPlaces) {
      warnings.push(`Truncated to ${config.maxDecimalPlaces} decimal places`);
    }

    // Round to allowed precision
    const rounded =
      Math.round(parsed * Math.pow(10, config.maxDecimalPlaces)) /
      Math.pow(10, config.maxDecimalPlaces);

    // Business logic validation
    if (config.fieldType === "coefficient") {
      if (rounded > 99999.9999999999) {
        return {
          success: false,
          error: `Coefficient value too large. Maximum: 99,999.9999999999`,
        };
      }
      if (rounded > 100) {
        warnings.push("Coefficient value seems unusually high");
      }
    } else if (config.fieldType === "time") {
      if (rounded > 99999.9999999999) {
        return {
          success: false,
          error: `Time value too large. Maximum: 99,999.9999999999`,
        };
      }
      if (fieldName?.includes("ngay") && rounded > 31) {
        warnings.push("Days value seems high for a month");
      }
      if (fieldName?.includes("gio") && rounded > 744) {
        warnings.push(
          "Hours value seems high for a month (744 = 31 days × 24 hours)",
        );
      }
    }

    return {
      success: true,
      value: rounded,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate DECIMAL(15,10) constraints
 */
export function validateDecimal15_10(value: number): {
  isValid: boolean;
  error?: string;
} {
  // DECIMAL(15,10) can store:
  // - Total 15 digits
  // - 10 decimal places
  // - So max 5 integer digits: 99999.9999999999

  if (Math.abs(value) >= 100000) {
    return {
      isValid: false,
      error:
        "Value exceeds DECIMAL(15,10) integer limit (max 5 digits before decimal)",
    };
  }

  // Check decimal precision (PostgreSQL handles this automatically, but good to validate)
  const valueStr = value.toString();
  const decimalPart = valueStr.split(".")[1] || "";
  if (decimalPart.length > 10) {
    return {
      isValid: false,
      error:
        "Value exceeds DECIMAL(15,10) precision limit (max 10 decimal places)",
    };
  }

  return { isValid: true };
}

/**
 * Get display precision for a field
 */
export function getDisplayPrecision(fieldName: string): number {
  const config = FIELD_PRECISION_CONFIG[fieldName];
  if (!config) return 2;

  // For display, show fewer decimals unless it's a high-precision value
  if (config.fieldType === "money") return 2;
  if (config.fieldType === "coefficient") return 6; // Show 6 out of 10 for readability
  if (config.fieldType === "time") return 4; // Show 4 out of 10 for readability

  return 2;
}

/**
 * Smart format - shows appropriate precision based on value
 */
export function smartFormatNumber(
  value: number | string | null | undefined,
  fieldName?: string,
): string {
  if (value === null || value === undefined || value === "") return "0";

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "0";

  const config = fieldName ? FIELD_PRECISION_CONFIG[fieldName] : null;

  // If it's a whole number, don't show decimals
  if (numValue === Math.floor(numValue)) {
    return numValue.toLocaleString("vi-VN");
  }

  // For small decimals, show more precision
  if (Math.abs(numValue) < 1) {
    const precision = config?.maxDecimalPlaces ?? 6;
    return numValue.toLocaleString("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    });
  }

  // For normal values, show reasonable precision
  const displayPrecision = fieldName ? getDisplayPrecision(fieldName) : 2;
  return numValue.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayPrecision,
  });
}
