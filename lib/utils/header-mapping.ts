/**
 * Header Mapping Utilities
 * Logic để map database fields to user-friendly Excel headers dựa trên saved configurations
 */

import type {
  MappingConfiguration,
  FieldMapping,
} from "@/lib/column-alias-config";

// ===== INTERFACES =====

export interface HeaderMappingResult {
  headers: Record<string, string>;
  mappedCount: number;
  unmappedFields: string[];
  confidence: number;
  source: "configuration" | "default" | "fallback";
}

export interface HeaderMappingOptions {
  useDefaultHeaders?: boolean;
  fallbackToFieldName?: boolean;
  includeConfidence?: boolean;
  prioritizeConfiguration?: boolean;
}

// ===== DEFAULT HEADERS =====

export const DEFAULT_FIELD_HEADERS: Record<string, string> = {
  employee_id: "Mã Nhân Viên",
  salary_month: "Tháng Lương",

  // Hệ số và thông số cơ bản
  he_so_lam_viec: "Hệ Số Làm Việc",
  he_so_phu_cap_ket_qua: "Hệ Số Phụ Cấp Kết Quả",
  he_so_luong_co_ban: "Hệ Số Lương Cơ Bản",
  luong_toi_thieu_cty: "Lương Tối Thiểu Công Ty",

  // Thời gian làm việc
  ngay_cong_trong_gio: "Ngày Công Trong Giờ",
  gio_cong_tang_ca: "Giờ Công Tăng Ca",
  gio_an_ca: "Giờ Ăn Ca",
  tong_gio_lam_viec: "Tổng Giờ Làm Việc",
  tong_he_so_quy_doi: "Tổng Hệ Số Quy Đổi",
  ngay_cong_chu_nhat: "Ngày Công Chủ Nhật",

  // Lương sản phẩm và đơn giá
  tong_luong_san_pham_cong_doan: "Tổng Lương Sản Phẩm Công Đoạn",
  don_gia_tien_luong_tren_gio: "Đơn Giá Tiền Lương Trên Giờ",
  tien_luong_san_pham_trong_gio: "Tiền Lương Sản Phẩm Trong Giờ",
  tien_luong_tang_ca: "Tiền Lương Tăng Ca",
  tien_luong_30p_an_ca: "Tiền Lương 30p Ăn Ca",
  tien_luong_chu_nhat: "Tiền Lương Chủ Nhật",

  // Thưởng và phụ cấp
  thuong_hieu_qua_lam_viec: "Thưởng Hiệu Quả Làm Việc",
  thuong_chuyen_can: "Thưởng Chuyên Cần",
  thuong_khac: "Thưởng Khác",
  phu_cap_tien_an: "Phụ Cấp Tiền Ăn",
  phu_cap_xang_xe: "Phụ Cấp Xăng Xe",
  phu_cap_dien_thoai: "Phụ Cấp Điện Thoại",
  phu_cap_khac: "Phụ Cấp Khác",

  // Lương CNKCP và vượt
  luong_cnkcp_vuot: "Lương CNKCP Vượt",
  tien_tang_ca_vuot: "Tiền Tăng Ca Vượt",

  // Nghỉ phép và lễ
  ngay_cong_phep_le: "Ngày Công Phép Lễ",
  tien_phep_le: "Tiền Phép Lễ",

  // Tổng cộng và khấu trừ
  tong_cong_tien_luong: "Tổng Cộng Tiền Lương",
  tien_boc_vac: "Tiền Bốc Vác",
  ho_tro_xang_xe: "Hỗ Trợ Xăng Xe",

  // Thuế và bảo hiểm
  thue_tncn_nam_2024: "Thuế TNCN Năm 2024",
  tam_ung: "Tạm Ứng",
  thue_tncn: "Thuế TNCN",
  bhxh_bhtn_bhyt_total: "BHXH + BHTN + BHYT",
  truy_thu_the_bhyt: "Truy Thu Thẻ BHYT",

  // Lương thực nhận
  tien_luong_thuc_nhan_cuoi_ky: "Tiền Lương Thực Nhận Cuối Kỳ",
};

// ===== HEADER MAPPING FUNCTIONS =====

/**
 * Map database fields to Excel headers using mapping configuration
 */
export function mapFieldsToHeaders(
  fields: string[],
  configuration?: MappingConfiguration,
  options: HeaderMappingOptions = {},
): HeaderMappingResult {
  const {
    useDefaultHeaders = true,
    fallbackToFieldName = true,
    includeConfidence = false,
    prioritizeConfiguration = true,
  } = options;

  const headers: Record<string, string> = {};
  const unmappedFields: string[] = [];
  let mappedCount = 0;
  let totalConfidence = 0;
  let source: "configuration" | "default" | "fallback" = "fallback";

  for (const field of fields) {
    let header: string | null = null;
    let fieldConfidence = 0;

    // Priority 1: Configuration mapping (if available and prioritized)
    if (prioritizeConfiguration && configuration?.field_mappings) {
      const fieldMapping = configuration.field_mappings.find(
        (mapping) => mapping.database_field === field,
      );

      if (fieldMapping) {
        header = fieldMapping.excel_column_name;
        fieldConfidence = fieldMapping.confidence_score;
        source = "configuration";
        mappedCount++;
      }
    }

    // Priority 2: Default headers
    if (!header && useDefaultHeaders && DEFAULT_FIELD_HEADERS[field]) {
      header = DEFAULT_FIELD_HEADERS[field];
      fieldConfidence = 90; // High confidence for default headers
      if (source === "fallback") source = "default";
    }

    // Priority 3: Configuration mapping (if not prioritized above)
    if (!header && !prioritizeConfiguration && configuration?.field_mappings) {
      const fieldMapping = configuration.field_mappings.find(
        (mapping) => mapping.database_field === field,
      );

      if (fieldMapping) {
        header = fieldMapping.excel_column_name;
        fieldConfidence = fieldMapping.confidence_score;
        source = "configuration";
        mappedCount++;
      }
    }

    // Priority 4: Fallback to field name
    if (!header && fallbackToFieldName) {
      header = formatFieldNameAsHeader(field);
      fieldConfidence = 30; // Low confidence for fallback
    }

    if (header) {
      headers[field] = header;
      if (includeConfidence) {
        totalConfidence += fieldConfidence;
      }
    } else {
      unmappedFields.push(field);
    }
  }

  const averageConfidence =
    includeConfidence && mappedCount > 0 ? totalConfidence / mappedCount : 0;

  return {
    headers,
    mappedCount,
    unmappedFields,
    confidence: averageConfidence,
    source,
  };
}

/**
 * Create reverse mapping from Excel headers to database fields
 */
export function createReverseHeaderMapping(
  configuration?: MappingConfiguration,
  includeDefaults = true,
): Record<string, string> {
  const reverseMapping: Record<string, string> = {};

  // Add configuration mappings
  if (configuration?.field_mappings) {
    configuration.field_mappings.forEach((mapping) => {
      const normalizedHeader = mapping.excel_column_name.toLowerCase().trim();
      reverseMapping[normalizedHeader] = mapping.database_field;
    });
  }

  // Add default mappings if not overridden
  if (includeDefaults) {
    Object.entries(DEFAULT_FIELD_HEADERS).forEach(([field, header]) => {
      const normalizedHeader = header.toLowerCase().trim();
      if (!reverseMapping[normalizedHeader]) {
        reverseMapping[normalizedHeader] = field;
      }
    });
  }

  return reverseMapping;
}

/**
 * Format field name as user-friendly header
 */
export function formatFieldNameAsHeader(fieldName: string): string {
  return fieldName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Validate header mapping configuration
 */
export function validateHeaderMapping(
  configuration: MappingConfiguration,
  requiredFields: string[] = [],
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  coverage: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (
    !configuration.field_mappings ||
    configuration.field_mappings.length === 0
  ) {
    errors.push("Configuration không có field mappings");
    return { isValid: false, errors, warnings, coverage: 0 };
  }

  // Check for duplicate database fields
  const dbFields = configuration.field_mappings.map((m) => m.database_field);
  const duplicateDbFields = dbFields.filter(
    (field, index) => dbFields.indexOf(field) !== index,
  );
  if (duplicateDbFields.length > 0) {
    errors.push(`Duplicate database fields: ${duplicateDbFields.join(", ")}`);
  }

  // Check for duplicate Excel headers
  const excelHeaders = configuration.field_mappings.map((m) =>
    m.excel_column_name.toLowerCase(),
  );
  const duplicateHeaders = excelHeaders.filter(
    (header, index) => excelHeaders.indexOf(header) !== index,
  );
  if (duplicateHeaders.length > 0) {
    errors.push(`Duplicate Excel headers: ${duplicateHeaders.join(", ")}`);
  }

  // Check required fields coverage
  const mappedFields = new Set(dbFields);
  const missingRequired = requiredFields.filter(
    (field) => !mappedFields.has(field),
  );
  if (missingRequired.length > 0) {
    warnings.push(`Missing required fields: ${missingRequired.join(", ")}`);
  }

  // Check confidence scores
  const lowConfidenceFields = configuration.field_mappings.filter(
    (m) => m.confidence_score < 50,
  );
  if (lowConfidenceFields.length > 0) {
    warnings.push(
      `${lowConfidenceFields.length} fields có confidence thấp (<50%)`,
    );
  }

  // Calculate coverage
  const coverage =
    requiredFields.length > 0
      ? ((requiredFields.length - missingRequired.length) /
          requiredFields.length) *
        100
      : 100;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    coverage,
  };
}

/**
 * Merge multiple header mappings with conflict resolution
 */
export function mergeHeaderMappings(
  configurations: MappingConfiguration[],
  conflictResolution:
    | "highest_confidence"
    | "latest"
    | "first" = "highest_confidence",
): Record<string, string> {
  const mergedHeaders: Record<string, string> = {};
  const fieldMappings = new Map<
    string,
    { header: string; confidence: number; timestamp: number }
  >();

  configurations.forEach((config, configIndex) => {
    if (!config.field_mappings) return;

    config.field_mappings.forEach((mapping) => {
      const field = mapping.database_field;
      const existing = fieldMappings.get(field);
      const timestamp = config.updated_at
        ? new Date(config.updated_at).getTime()
        : configIndex;

      let shouldUse = false;

      if (!existing) {
        shouldUse = true;
      } else {
        switch (conflictResolution) {
          case "highest_confidence":
            shouldUse = mapping.confidence_score > existing.confidence;
            break;
          case "latest":
            shouldUse = timestamp > existing.timestamp;
            break;
          case "first":
            shouldUse = false; // Keep existing
            break;
        }
      }

      if (shouldUse) {
        fieldMappings.set(field, {
          header: mapping.excel_column_name,
          confidence: mapping.confidence_score,
          timestamp,
        });
      }
    });
  });

  // Convert to simple header mapping
  fieldMappings.forEach((value, field) => {
    mergedHeaders[field] = value.header;
  });

  return mergedHeaders;
}

/**
 * Generate header mapping preview
 */
export function generateHeaderMappingPreview(
  fields: string[],
  configuration?: MappingConfiguration,
): {
  preview: Array<{
    field: string;
    header: string;
    source: "configuration" | "default" | "fallback";
    confidence: number;
  }>;
  summary: {
    total: number;
    fromConfig: number;
    fromDefault: number;
    fallback: number;
    averageConfidence: number;
  };
} {
  const preview: Array<{
    field: string;
    header: string;
    source: "configuration" | "default" | "fallback";
    confidence: number;
  }> = [];

  let fromConfig = 0;
  let fromDefault = 0;
  let fallback = 0;
  let totalConfidence = 0;

  fields.forEach((field) => {
    let header: string;
    let source: "configuration" | "default" | "fallback";
    let confidence: number;

    // Check configuration first
    const configMapping = configuration?.field_mappings?.find(
      (m) => m.database_field === field,
    );
    if (configMapping) {
      header = configMapping.excel_column_name;
      source = "configuration";
      confidence = configMapping.confidence_score;
      fromConfig++;
    } else if (DEFAULT_FIELD_HEADERS[field]) {
      header = DEFAULT_FIELD_HEADERS[field];
      source = "default";
      confidence = 90;
      fromDefault++;
    } else {
      header = formatFieldNameAsHeader(field);
      source = "fallback";
      confidence = 30;
      fallback++;
    }

    preview.push({ field, header, source, confidence });
    totalConfidence += confidence;
  });

  return {
    preview,
    summary: {
      total: fields.length,
      fromConfig,
      fromDefault,
      fallback,
      averageConfidence:
        fields.length > 0 ? totalConfidence / fields.length : 0,
    },
  };
}
