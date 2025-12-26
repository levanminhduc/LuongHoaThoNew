import * as XLSX from "xlsx";
import {
  type ColumnAlias,
  type EnhancedColumnMapping,
  type ImportMappingResult,
  type MappingSuggestion,
  type MappingConfiguration,
  validateMappingConfiguration,
  CONFIDENCE_LEVELS,
} from "./column-alias-config";

export interface ColumnMapping {
  [key: string]: string; // Excel column name -> Database field name
}

export interface PayrollFieldConfig {
  field: string;
  label: string;
  type: "text" | "number" | "date";
  required: boolean;
  maxLength?: number;
  validation?: (value: unknown) => string | null;
}

export interface AdvancedPayrollData {
  employee_id: string;
  salary_month: string;
  source_file: string;

  // Dynamic fields based on column mapping
  [key: string]: unknown;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  errors: Array<{
    row: number;
    employee_id: string;
    field: string;
    error: string;
    type: "error" | "warning";
  }>;
  data: AdvancedPayrollData[];
  columnMappings: ColumnMapping;
  detectedColumns: string[];
  summary: {
    filesProcessed: number;
    duplicatesFound: number;
    missingEmployees: number;
    dataInconsistencies: number;
  };
}

// Define all possible payroll fields with validation
export const PAYROLL_FIELD_CONFIG: PayrollFieldConfig[] = [
  {
    field: "employee_id",
    label: "Mã Nhân Viên",
    type: "text",
    required: true,
    maxLength: 50,
  },
  {
    field: "salary_month",
    label: "Tháng Lương",
    type: "text",
    required: true,
    maxLength: 20,
  },
  {
    field: "he_so_lam_viec",
    label: "Hệ Số Làm Việc",
    type: "number",
    required: false,
  },
  {
    field: "he_so_phu_cap_ket_qua",
    label: "Hệ Số Phụ Cấp Kết Quả",
    type: "number",
    required: false,
  },
  {
    field: "he_so_luong_co_ban",
    label: "Hệ Số Lương Cơ Bản",
    type: "number",
    required: false,
  },
  {
    field: "luong_toi_thieu_cty",
    label: "Lương Tối Thiểu Công Ty",
    type: "number",
    required: false,
  },
  {
    field: "ngay_cong_trong_gio",
    label: "Ngày Công Trong Giờ",
    type: "number",
    required: false,
  },
  {
    field: "gio_cong_tang_ca",
    label: "Giờ Công Tăng Ca",
    type: "number",
    required: false,
  },
  { field: "gio_an_ca", label: "Giờ Ăn Ca", type: "number", required: false },
  {
    field: "tong_gio_lam_viec",
    label: "Tổng Giờ Làm Việc",
    type: "number",
    required: false,
  },
  {
    field: "tong_he_so_quy_doi",
    label: "Tổng Hệ Số Quy Đổi",
    type: "number",
    required: false,
  },
  {
    field: "tong_luong_san_pham_cong_doan",
    label: "Tổng Lương Sản Phẩm Công Đoạn",
    type: "number",
    required: false,
  },
  {
    field: "don_gia_tien_luong_tren_gio",
    label: "Đơn Giá Tiền Lương Trên Giờ",
    type: "number",
    required: false,
  },
  {
    field: "tien_luong_san_pham_trong_gio",
    label: "Tiền Lương Sản Phẩm Trong Giờ",
    type: "number",
    required: false,
  },
  {
    field: "tien_luong_tang_ca",
    label: "Tiền Lương Tăng Ca",
    type: "number",
    required: false,
  },
  {
    field: "tien_luong_30p_an_ca",
    label: "Tiền Lương 30p Ăn Ca",
    type: "number",
    required: false,
  },
  {
    field: "tien_khen_thuong_chuyen_can",
    label: "Tiền Khen Thưởng Chuyên Cần",
    type: "number",
    required: false,
  },
  {
    field: "luong_hoc_viec_pc_luong",
    label: "Lương Học Việc PC Lương",
    type: "number",
    required: false,
  },
  {
    field: "tong_cong_tien_luong_san_pham",
    label: "Tổng Cộng Tiền Lương Sản Phẩm",
    type: "number",
    required: false,
  },
  {
    field: "ho_tro_thoi_tiet_nong",
    label: "Hỗ Trợ Thời Tiết Nóng",
    type: "number",
    required: false,
  },
  {
    field: "bo_sung_luong",
    label: "Bổ Sung Lương",
    type: "number",
    required: false,
  },
  {
    field: "pc_luong_cho_viec",
    label: "PC Lương Chờ Việc",
    type: "number",
    required: false,
  },
  {
    field: "bhxh_21_5_percent",
    label: "BHXH 21.5%",
    type: "number",
    required: false,
  },
  {
    field: "pc_cdcs_pccc_atvsv",
    label: "PC CDCS PCCC ATVSV",
    type: "number",
    required: false,
  },
  {
    field: "luong_phu_nu_hanh_kinh",
    label: "Lương Phụ Nữ Hành Kinh",
    type: "number",
    required: false,
  },
  {
    field: "tien_con_bu_thai_7_thang",
    label: "Tiền Con Bù Thai 7 Tháng",
    type: "number",
    required: false,
  },
  {
    field: "ho_tro_gui_con_nha_tre",
    label: "Hỗ Trợ Gửi Con Nhà Trẻ",
    type: "number",
    required: false,
  },
  {
    field: "ngay_cong_phep_le",
    label: "Ngày Công Phép Lễ",
    type: "number",
    required: false,
  },
  {
    field: "tien_phep_le",
    label: "Tiền Phép Lễ",
    type: "number",
    required: false,
  },
  {
    field: "tong_cong_tien_luong",
    label: "Tổng Cộng Tiền Lương",
    type: "number",
    required: false,
  },
  {
    field: "tien_boc_vac",
    label: "Tiền Bốc Vác",
    type: "number",
    required: false,
  },
  {
    field: "ho_tro_xang_xe",
    label: "Hỗ Trợ Xăng Xe",
    type: "number",
    required: false,
  },
  {
    field: "thue_tncn_nam_2024",
    label: "Thuế TNCN Năm 2024",
    type: "number",
    required: false,
  },
  { field: "tam_ung", label: "Tạm Ứng", type: "number", required: false },
  { field: "thue_tncn", label: "Thuế TNCN", type: "number", required: false },
  {
    field: "bhxh_bhtn_bhyt_total",
    label: "BHXH BHTN BHYT Total",
    type: "number",
    required: false,
  },
  {
    field: "truy_thu_the_bhyt",
    label: "Truy Thu Thẻ BHYT",
    type: "number",
    required: false,
  },
  {
    field: "tien_luong_thuc_nhan_cuoi_ky",
    label: "Tiền Lương Thực Nhận Cuối Kỳ",
    type: "number",
    required: false,
  },

  // Bổ sung 4 cột mới
  {
    field: "ngay_cong_chu_nhat",
    label: "Ngày Công Chủ Nhật",
    type: "number",
    required: false,
  },
  {
    field: "tien_luong_chu_nhat",
    label: "Tiền Lương Chủ Nhật",
    type: "number",
    required: false,
  },
  {
    field: "luong_cnkcp_vuot",
    label: "Lương CNKCP Vượt",
    type: "number",
    required: false,
  },
  {
    field: "tien_tang_ca_vuot",
    label: "Tiền Tăng Ca Vượt",
    type: "number",
    required: false,
  },
];

export function detectColumns(worksheet: XLSX.WorkSheet): string[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
  }) as unknown[][];
  if (jsonData.length === 0) return [];

  return (jsonData[0] as unknown[])
    .map((header) => String(header || "").trim())
    .filter((header) => header.length > 0);
}

// Helper function to apply saved configuration with enhanced matching
export function applySavedConfigurationWithFallback(
  detectedColumns: string[],
  savedConfiguration: MappingConfiguration,
  fallbackMapping?: ColumnMapping,
): { mapping: ColumnMapping; appliedCount: number; confidence: number } {
  const mapping: ColumnMapping = {};
  let appliedCount = 0;
  let totalConfidence = 0;

  // Apply saved field mappings with enhanced matching
  if (savedConfiguration.field_mappings) {
    savedConfiguration.field_mappings.forEach((fieldMapping) => {
      const dbField = fieldMapping.database_field;
      const excelColumn = fieldMapping.excel_column_name;

      // Try exact match first
      const exactMatch = detectedColumns.find(
        (col) => col.toLowerCase() === excelColumn.toLowerCase(),
      );

      if (exactMatch) {
        mapping[dbField] = exactMatch;
        appliedCount++;
        totalConfidence += fieldMapping.confidence_score;
        return;
      }

      // Try fuzzy matching
      const fuzzyMatch = detectedColumns.find((col) => {
        const colLower = col.toLowerCase();
        const excelLower = excelColumn.toLowerCase();

        // Contains match
        if (colLower.includes(excelLower) || excelLower.includes(colLower)) {
          return true;
        }

        // Word boundary match
        const colWords = colLower.split(/\s+/);
        const excelWords = excelLower.split(/\s+/);

        return colWords.some((colWord) =>
          excelWords.some(
            (excelWord) =>
              colWord.includes(excelWord) || excelWord.includes(colWord),
          ),
        );
      });

      if (fuzzyMatch) {
        mapping[dbField] = fuzzyMatch;
        appliedCount++;
        totalConfidence += Math.max(fieldMapping.confidence_score * 0.8, 60);
      }
    });
  }

  // Fill in missing mappings with fallback
  if (fallbackMapping) {
    Object.keys(fallbackMapping).forEach((dbField) => {
      if (!mapping[dbField]) {
        mapping[dbField] = fallbackMapping[dbField];
      }
    });
  }

  const averageConfidence =
    appliedCount > 0 ? totalConfidence / appliedCount : 0;

  return {
    mapping,
    appliedCount,
    confidence: averageConfidence,
  };
}

// Helper function to create mapping configuration from successful mapping
export function createMappingConfigurationFromMapping(
  mapping: ColumnMapping,
  configName: string,
  description?: string,
): Omit<MappingConfiguration, "id"> {
  const fieldMappings = Object.entries(mapping).map(
    ([dbField, excelColumn]) => ({
      database_field: dbField,
      excel_column_name: excelColumn,
      confidence_score: 95, // High confidence for successful mappings
      mapping_type: "manual" as const,
      validation_passed: true,
    }),
  );

  return {
    config_name: configName,
    description:
      description || `Auto-generated configuration from successful mapping`,
    field_mappings: fieldMappings,
    is_default: false,
    is_active: true,
    created_by: "system",
  };
}

// Helper function to merge multiple mapping configurations
export type FieldMapping = MappingConfiguration["field_mappings"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;

export function mergeMappingConfigurations(
  configs: MappingConfiguration[],
  mergedName: string,
): Omit<MappingConfiguration, "id"> {
  const mergedFieldMappings = new Map<string, FieldMapping>();

  // Merge field mappings, keeping highest confidence for each database field
  configs.forEach((config) => {
    if (config.field_mappings) {
      config.field_mappings.forEach((fieldMapping) => {
        const existing = mergedFieldMappings.get(fieldMapping.database_field);
        if (
          !existing ||
          fieldMapping.confidence_score > existing.confidence_score
        ) {
          mergedFieldMappings.set(fieldMapping.database_field, fieldMapping);
        }
      });
    }
  });

  return {
    config_name: mergedName,
    description: `Merged configuration from ${configs.length} configurations`,
    field_mappings: Array.from(mergedFieldMappings.values()),
    is_default: false,
    is_active: true,
    created_by: "system",
  };
}

// Enhanced auto-mapping with aliases and saved configurations support
export async function autoMapColumnsWithAliases(
  detectedColumns: string[],
  aliases: ColumnAlias[] = [],
  savedConfiguration?: MappingConfiguration,
): Promise<ImportMappingResult> {
  const mapping: EnhancedColumnMapping = {};
  const unmappedColumns: string[] = [];
  const suggestions: MappingSuggestion[] = [];

  // Create saved configuration lookup map for highest priority matching
  const savedConfigMap = new Map<
    string,
    { field: string; confidence: number }
  >();
  if (savedConfiguration?.field_mappings) {
    savedConfiguration.field_mappings.forEach((fieldMapping) => {
      const normalizedExcelColumn = fieldMapping.excel_column_name
        .toLowerCase()
        .trim();
      savedConfigMap.set(normalizedExcelColumn, {
        field: fieldMapping.database_field,
        confidence: fieldMapping.confidence_score,
      });
    });
  }

  // Create alias lookup map for faster searching
  const aliasMap = new Map<string, ColumnAlias[]>();
  aliases.forEach((alias) => {
    const normalizedAlias = alias.alias_name.toLowerCase().trim();
    if (!aliasMap.has(normalizedAlias)) {
      aliasMap.set(normalizedAlias, []);
    }
    aliasMap.get(normalizedAlias)!.push(alias);
  });

  // Process each detected column
  for (const column of detectedColumns) {
    const normalizedColumn = column.toLowerCase().trim();
    let bestMatch: {
      field: string;
      confidence: number;
      type: "exact" | "fuzzy" | "alias" | "saved_config";
      alias?: ColumnAlias;
      savedConfig?: boolean;
    } | null = null;

    // 1. Check for saved configuration matches (highest priority)
    const savedConfigMatch = savedConfigMap.get(normalizedColumn);
    if (savedConfigMatch) {
      bestMatch = {
        field: savedConfigMatch.field,
        confidence: Math.max(savedConfigMatch.confidence, 95), // Boost confidence for saved configs
        type: "saved_config",
        savedConfig: true,
      };
    }

    // 2. Check for fuzzy saved configuration matches
    if (!bestMatch && savedConfiguration?.field_mappings) {
      const fuzzyConfigMatches: Array<{
        field: string;
        confidence: number;
        score: number;
      }> = [];

      savedConfiguration.field_mappings.forEach((fieldMapping) => {
        const excelColumn = fieldMapping.excel_column_name.toLowerCase();
        let score = 0;

        // Contains match
        if (
          excelColumn.includes(normalizedColumn) ||
          normalizedColumn.includes(excelColumn)
        ) {
          score = Math.max(80, fieldMapping.confidence_score * 0.9);
        }
        // Word boundary matches
        else if (
          excelColumn
            .split(/\s+/)
            .some(
              (word) =>
                normalizedColumn.includes(word) ||
                word.includes(normalizedColumn),
            )
        ) {
          score = Math.max(70, fieldMapping.confidence_score * 0.8);
        }

        if (score > 0) {
          fuzzyConfigMatches.push({
            field: fieldMapping.database_field,
            confidence: fieldMapping.confidence_score,
            score,
          });
        }
      });

      if (fuzzyConfigMatches.length > 0) {
        const bestFuzzyConfig = fuzzyConfigMatches.reduce((best, current) =>
          current.score > best.score ? current : best,
        );

        if (bestFuzzyConfig.score >= 70) {
          bestMatch = {
            field: bestFuzzyConfig.field,
            confidence: bestFuzzyConfig.confidence,
            type: "saved_config",
            savedConfig: true,
          };
        }
      }
    }

    // 3. Check for exact alias matches
    if (!bestMatch) {
      const exactAliasMatches = aliasMap.get(normalizedColumn) || [];
      if (exactAliasMatches.length > 0) {
        // Use the alias with highest confidence score
        const bestAlias = exactAliasMatches.reduce((best, current) =>
          current.confidence_score > best.confidence_score ? current : best,
        );
        bestMatch = {
          field: bestAlias.database_field,
          confidence: bestAlias.confidence_score,
          type: "alias",
          alias: bestAlias,
        };
      }
    }

    // 4. Check for exact field name matches
    if (!bestMatch) {
      const exactFieldMatch = PAYROLL_FIELD_CONFIG.find(
        (field) => field.field.toLowerCase() === normalizedColumn,
      );
      if (exactFieldMatch) {
        bestMatch = {
          field: exactFieldMatch.field,
          confidence: 100,
          type: "exact",
        };
      }
    }

    // 5. Check for fuzzy alias matches
    if (!bestMatch) {
      const fuzzyMatches: Array<{ alias: ColumnAlias; score: number }> = [];

      aliases.forEach((alias) => {
        const aliasName = alias.alias_name.toLowerCase();
        let score = 0;

        // Contains match
        if (
          aliasName.includes(normalizedColumn) ||
          normalizedColumn.includes(aliasName)
        ) {
          score = Math.max(60, alias.confidence_score * 0.7);
        }
        // Word boundary matches
        else if (
          aliasName
            .split(/\s+/)
            .some(
              (word) =>
                normalizedColumn.includes(word) ||
                word.includes(normalizedColumn),
            )
        ) {
          score = Math.max(40, alias.confidence_score * 0.5);
        }

        if (score > 0) {
          fuzzyMatches.push({ alias, score });
        }
      });

      if (fuzzyMatches.length > 0) {
        const bestFuzzy = fuzzyMatches.reduce((best, current) =>
          current.score > best.score ? current : best,
        );

        if (bestFuzzy.score >= 40) {
          bestMatch = {
            field: bestFuzzy.alias.database_field,
            confidence: bestFuzzy.score,
            type: "fuzzy",
            alias: bestFuzzy.alias,
          };
        }
      }
    }

    // 4. Check for fuzzy field name matches
    if (!bestMatch) {
      const fuzzyFieldMatches: Array<{ field: string; score: number }> = [];

      PAYROLL_FIELD_CONFIG.forEach((fieldConfig) => {
        const fieldName = fieldConfig.field.toLowerCase();
        const fieldLabel = fieldConfig.label.toLowerCase();

        let score = 0;

        // Check field name
        if (
          fieldName.includes(normalizedColumn) ||
          normalizedColumn.includes(fieldName)
        ) {
          score = 70;
        }
        // Check field label
        else if (
          fieldLabel.includes(normalizedColumn) ||
          normalizedColumn.includes(fieldLabel)
        ) {
          score = 60;
        }
        // Word boundary matches
        else if (
          fieldLabel
            .split(/\s+/)
            .some(
              (word) =>
                normalizedColumn.includes(word) ||
                word.includes(normalizedColumn),
            )
        ) {
          score = 40;
        }

        if (score > 0) {
          fuzzyFieldMatches.push({ field: fieldConfig.field, score });
        }
      });

      if (fuzzyFieldMatches.length > 0) {
        const bestFuzzyField = fuzzyFieldMatches.reduce((best, current) =>
          current.score > best.score ? current : best,
        );

        if (bestFuzzyField.score >= 40) {
          bestMatch = {
            field: bestFuzzyField.field,
            confidence: bestFuzzyField.score,
            type: "fuzzy",
          };
        }
      }
    }

    // Add to mapping or unmapped list
    if (bestMatch && bestMatch.confidence >= 30) {
      mapping[column] = {
        database_field: bestMatch.field,
        confidence_score: bestMatch.confidence,
        mapping_type:
          bestMatch.type === "saved_config" ? "manual" : bestMatch.type,
        matched_alias: bestMatch.alias,
        validation_status: bestMatch.confidence >= 70 ? "valid" : "warning",
        validation_messages:
          bestMatch.confidence < 70
            ? [
                `Độ tin cậy thấp (${bestMatch.confidence}%), vui lòng kiểm tra lại`,
              ]
            : [],
      };
    } else {
      unmappedColumns.push(column);

      // Generate suggestions for unmapped columns
      const columnSuggestions = generateSuggestions(column, aliases);
      if (columnSuggestions.length > 0) {
        suggestions.push({
          excel_column: column,
          suggested_field: columnSuggestions[0].field,
          confidence_score: columnSuggestions[0].score,
          reason: columnSuggestions[0].reason,
          alternative_matches: columnSuggestions.slice(1, 4),
        });
      }
    }
  }

  // Validate mapping for conflicts
  const conflicts = validateMappingConfiguration(mapping);

  // Calculate confidence summary
  const mappedEntries = Object.values(mapping);
  const confidenceSummary = {
    high_confidence: mappedEntries.filter(
      (m) => m.confidence_score >= CONFIDENCE_LEVELS.HIGH,
    ).length,
    medium_confidence: mappedEntries.filter(
      (m) =>
        m.confidence_score >= CONFIDENCE_LEVELS.MEDIUM &&
        m.confidence_score < CONFIDENCE_LEVELS.HIGH,
    ).length,
    low_confidence: mappedEntries.filter(
      (m) => m.confidence_score < CONFIDENCE_LEVELS.MEDIUM,
    ).length,
    manual_required: unmappedColumns.length,
  };

  return {
    success: conflicts.filter((c) => c.severity === "error").length === 0,
    mapping,
    detected_columns: detectedColumns,
    unmapped_columns: unmappedColumns,
    conflicts,
    suggestions,
    confidence_summary: confidenceSummary,
  };
}

// Legacy function for backward compatibility
export function autoMapColumns(detectedColumns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  // Auto-mapping rules based on common column names
  const autoMappingRules: { [key: string]: string[] } = {
    employee_id: [
      "mã nhân viên",
      "employee_id",
      "ma_nhan_vien",
      "id",
      "mã nv",
      "manv",
    ],
    salary_month: [
      "tháng lương",
      "salary_month",
      "thang_luong",
      "month",
      "tháng",
    ],
    he_so_lam_viec: ["hệ số làm việc", "he_so_lam_viec", "hệ số lv"],
    tong_cong_tien_luong: [
      "tổng cộng tiền lương",
      "tong_cong_tien_luong",
      "tổng lương",
      "total_salary",
    ],
    tien_luong_thuc_nhan_cuoi_ky: [
      "tiền lương thực nhận cuối kỳ",
      "tien_luong_thuc_nhan_cuoi_ky",
      "lương thực nhận",
      "net_salary",
    ],
    bhxh_bhtn_bhyt_total: [
      "bhxh bhtn bhyt total",
      "bhxh_bhtn_bhyt_total",
      "bảo hiểm",
      "insurance",
    ],
    thue_tncn: ["thuế tncn", "thue_tncn", "thuế", "tax"],
    tam_ung: ["tạm ứng", "tam_ung", "advance"],
  };

  detectedColumns.forEach((column) => {
    const normalizedColumn = column.toLowerCase().trim();

    for (const [field, patterns] of Object.entries(autoMappingRules)) {
      if (patterns.some((pattern) => normalizedColumn.includes(pattern))) {
        mapping[column] = field;
        break;
      }
    }
  });

  return mapping;
}

// Helper function to generate suggestions for unmapped columns
function generateSuggestions(
  column: string,
  aliases: ColumnAlias[],
): Array<{ field: string; score: number; reason: string }> {
  const suggestions: Array<{ field: string; score: number; reason: string }> =
    [];
  const normalizedColumn = column.toLowerCase().trim();

  // Check all aliases for partial matches
  aliases.forEach((alias) => {
    const aliasName = alias.alias_name.toLowerCase();
    let score = 0;
    let reason = "";

    // Partial contains match
    if (
      aliasName.includes(normalizedColumn) ||
      normalizedColumn.includes(aliasName)
    ) {
      score = alias.confidence_score * 0.6;
      reason = `Khớp một phần với alias "${alias.alias_name}"`;
    }
    // Word similarity
    else {
      const columnWords = normalizedColumn.split(/\s+/);
      const aliasWords = aliasName.split(/\s+/);
      const commonWords = columnWords.filter((word) =>
        aliasWords.some(
          (aliasWord) => aliasWord.includes(word) || word.includes(aliasWord),
        ),
      );

      if (commonWords.length > 0) {
        score =
          (commonWords.length /
            Math.max(columnWords.length, aliasWords.length)) *
          30;
        reason = `Có từ khóa chung: ${commonWords.join(", ")}`;
      }
    }

    if (score > 20) {
      suggestions.push({
        field: alias.database_field,
        score,
        reason,
      });
    }
  });

  // Check field labels for similarity
  PAYROLL_FIELD_CONFIG.forEach((fieldConfig) => {
    const fieldLabel = fieldConfig.label.toLowerCase();
    let score = 0;
    let reason = "";

    if (
      fieldLabel.includes(normalizedColumn) ||
      normalizedColumn.includes(fieldLabel)
    ) {
      score = 50;
      reason = `Khớp một phần với label "${fieldConfig.label}"`;
    } else {
      const columnWords = normalizedColumn.split(/\s+/);
      const labelWords = fieldLabel.split(/\s+/);
      const commonWords = columnWords.filter((word) =>
        labelWords.some(
          (labelWord) => labelWord.includes(word) || word.includes(labelWord),
        ),
      );

      if (commonWords.length > 0) {
        score =
          (commonWords.length /
            Math.max(columnWords.length, labelWords.length)) *
          25;
        reason = `Có từ khóa chung với "${fieldConfig.label}": ${commonWords.join(", ")}`;
      }
    }

    if (score > 15) {
      suggestions.push({
        field: fieldConfig.field,
        score,
        reason,
      });
    }
  });

  // Remove duplicates and sort by score
  const uniqueSuggestions = suggestions.reduce(
    (acc, current) => {
      const existing = acc.find((s) => s.field === current.field);
      if (!existing || current.score > existing.score) {
        return [...acc.filter((s) => s.field !== current.field), current];
      }
      return acc;
    },
    [] as Array<{ field: string; score: number; reason: string }>,
  );

  return uniqueSuggestions.sort((a, b) => b.score - a.score);
}

// Function to load aliases from database
export async function loadColumnAliases(): Promise<ColumnAlias[]> {
  try {
    // This would typically be called from a component with access to auth token
    // For now, return empty array - will be populated by calling component
    return [];
  } catch (error) {
    console.error("Error loading column aliases:", error);
    return [];
  }
}

export function validateValue(
  value: unknown,
  field: PayrollFieldConfig,
): string | null {
  if (field.required && (!value || String(value).trim() === "")) {
    return `${field.label} là trường bắt buộc`;
  }

  if (!value || String(value).trim() === "") {
    return null; // Optional field, empty is OK
  }

  const stringValue = String(value).trim();

  if (field.maxLength && stringValue.length > field.maxLength) {
    return `${field.label} vượt quá ${field.maxLength} ký tự`;
  }

  if (field.type === "number") {
    const numValue = Number.parseFloat(stringValue);
    if (isNaN(numValue)) {
      return `${field.label} phải là số hợp lệ`;
    }
  }

  if (field.type === "date") {
    const dateValue = new Date(stringValue);
    if (isNaN(dateValue.getTime())) {
      return `${field.label} phải là ngày hợp lệ`;
    }
  }

  if (field.validation) {
    return field.validation(value);
  }

  return null;
}

export function parseAdvancedExcelFiles(
  files: { buffer: Buffer; filename: string }[],
  columnMappings: ColumnMapping[],
): ImportResult {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    warningCount: 0,
    errors: [],
    data: [],
    columnMappings: {},
    detectedColumns: [],
    summary: {
      filesProcessed: 0,
      duplicatesFound: 0,
      missingEmployees: 0,
      dataInconsistencies: 0,
    },
  };

  const allData: AdvancedPayrollData[] = [];
  const seenEmployeeMonths = new Set<string>();
  const fieldConfigs = PAYROLL_FIELD_CONFIG.reduce(
    (acc, config) => {
      acc[config.field] = config;
      return acc;
    },
    {} as { [key: string]: PayrollFieldConfig },
  );

  try {
    files.forEach((file, fileIndex) => {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      result.summary.filesProcessed++;

      // Detect columns if not provided
      const detectedColumns = detectColumns(worksheet);
      if (fileIndex === 0) {
        result.detectedColumns = detectedColumns;
      }

      // Use provided mapping or auto-detect
      const mapping =
        columnMappings[fileIndex] || autoMapColumns(detectedColumns);
      if (fileIndex === 0) {
        result.columnMappings = mapping;
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];
      if (jsonData.length < 2) return;

      const headers = jsonData[0];
      const rows = jsonData.slice(1);

      rows.forEach((row, rowIndex) => {
        const actualRowNumber = rowIndex + 2;
        result.totalRows++;

        if (!row || row.length === 0) return;

        const rowData: AdvancedPayrollData = {
          employee_id: "",
          salary_month: "",
          source_file: file.filename,
        };

        let hasError = false;

        // Map each column to database field
        Object.entries(mapping).forEach(([excelColumn, dbField]) => {
          const columnIndex = headers.indexOf(excelColumn);
          if (columnIndex === -1) return;

          const cellValue = row[columnIndex];
          const fieldConfig = fieldConfigs[dbField];

          if (fieldConfig) {
            const validationError = validateValue(cellValue, fieldConfig);
            if (validationError) {
              result.errors.push({
                row: actualRowNumber,
                employee_id: rowData.employee_id || "N/A",
                field: dbField,
                error: validationError,
                type: fieldConfig.required ? "error" : "warning",
              });

              if (fieldConfig.required) {
                hasError = true;
              } else {
                result.warningCount++;
              }
            }
          }

          // Convert value based on type
          if (fieldConfig?.type === "number") {
            rowData[dbField] = Number.parseFloat(String(cellValue || "0")) || 0;
          } else {
            rowData[dbField] = String(cellValue || "").trim();
          }
        });

        // Check for required fields
        if (!rowData.employee_id) {
          result.errors.push({
            row: actualRowNumber,
            employee_id: "N/A",
            field: "employee_id",
            error: "Thiếu mã nhân viên",
            type: "error",
          });
          hasError = true;
        }

        if (!rowData.salary_month) {
          result.errors.push({
            row: actualRowNumber,
            employee_id: rowData.employee_id,
            field: "salary_month",
            error: "Thiếu tháng lương",
            type: "error",
          });
          hasError = true;
        }

        // Check for duplicates
        const employeeMonthKey = `${rowData.employee_id}-${rowData.salary_month}`;
        if (seenEmployeeMonths.has(employeeMonthKey)) {
          result.errors.push({
            row: actualRowNumber,
            employee_id: rowData.employee_id,
            field: "duplicate",
            error: "Dữ liệu trùng lặp (cùng nhân viên và tháng)",
            type: "warning",
          });
          result.summary.duplicatesFound++;
          result.warningCount++;
        } else {
          seenEmployeeMonths.add(employeeMonthKey);
        }

        if (hasError) {
          result.errorCount++;
        } else {
          result.successCount++;
          allData.push(rowData);
        }
      });
    });

    result.data = allData;
    result.success = result.errorCount === 0;
  } catch (error) {
    result.errors.push({
      row: 0,
      employee_id: "N/A",
      field: "general",
      error: `Lỗi khi xử lý file: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    result.errorCount++;
  }

  return result;
}
