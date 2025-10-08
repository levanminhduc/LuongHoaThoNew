import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

// Mapping database fields to user-friendly Vietnamese headers
const FIELD_HEADERS: Record<string, string> = {
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

  // Thưởng và phụ cấp
  tien_khen_thuong_chuyen_can: "Tiền Khen Thưởng Chuyên Cần",
  luong_hoc_viec_pc_luong: "Lương Học Việc PC Lương",
  tong_cong_tien_luong_san_pham: "Tổng Cộng Tiền Lương Sản Phẩm",
  ho_tro_thoi_tiet_nong: "Hỗ Trợ Thời Tiết Nóng",
  bo_sung_luong: "Bổ Sung Lương",
  tien_luong_chu_nhat: "Tiền Lương Chủ Nhật",
  luong_cnkcp_vuot: "Lương CNKCP Vượt",
  tien_tang_ca_vuot: "Tiền Tăng Ca Vượt",

  // Bảo hiểm và phúc lợi
  bhxh_21_5_percent: "BHXH 21.5%",
  pc_cdcs_pccc_atvsv: "PC CDCS PCCC ATVSV",
  luong_phu_nu_hanh_kinh: "Lương Phụ Nữ Hành Kinh",
  tien_con_bu_thai_7_thang: "Tiền Con Bú Thai 7 Tháng",
  ho_tro_gui_con_nha_tre: "Hỗ Trợ Gửi Con Nhà Trẻ",

  // Phép và lễ
  ngay_cong_phep_le: "Ngày Công Phép Lễ",
  tien_phep_le: "Tiền Phép Lễ",

  // Tổng lương và phụ cấp khác
  tong_cong_tien_luong: "Tổng Cộng Tiền Lương",
  tien_boc_vac: "Tiền Bốc Vác",
  ho_tro_xang_xe: "Hỗ Trợ Xăng Xe",

  // Thuế và khấu trừ
  thue_tncn_nam_2024: "Thuế TNCN Năm 2024",
  tam_ung: "Tạm Ứng",
  thue_tncn: "Thuế TNCN",
  bhxh_bhtn_bhyt_total: "BHXH BHTN BHYT Total",
  truy_thu_the_bhyt: "Truy Thu Thẻ BHYT",

  // Lương thực nhận
  tien_luong_thuc_nhan_cuoi_ky: "Tiền Lương Thực Nhận Cuối Kỳ",
};

// Get all payroll fields (excluding metadata)
const PAYROLL_FIELDS = [
  "employee_id",
  "salary_month",
  "he_so_lam_viec",
  "he_so_phu_cap_ket_qua",
  "he_so_luong_co_ban",
  "luong_toi_thieu_cty",
  "ngay_cong_trong_gio",
  "gio_cong_tang_ca",
  "gio_an_ca",
  "tong_gio_lam_viec",
  "tong_he_so_quy_doi",
  "ngay_cong_chu_nhat", // Bổ sung cột mới
  "tong_luong_san_pham_cong_doan",
  "don_gia_tien_luong_tren_gio",
  "tien_luong_san_pham_trong_gio",
  "tien_luong_tang_ca",
  "tien_luong_30p_an_ca",
  "tien_khen_thuong_chuyen_can",
  "luong_hoc_viec_pc_luong",
  "tong_cong_tien_luong_san_pham",
  "ho_tro_thoi_tiet_nong",
  "bo_sung_luong",
  "tien_luong_chu_nhat",
  "luong_cnkcp_vuot",
  "tien_tang_ca_vuot", // Bổ sung 3 cột mới
  "bhxh_21_5_percent",
  "pc_cdcs_pccc_atvsv",
  "luong_phu_nu_hanh_kinh",
  "tien_con_bu_thai_7_thang",
  "ho_tro_gui_con_nha_tre",
  "ngay_cong_phep_le",
  "tien_phep_le",
  "tong_cong_tien_luong",
  "tien_boc_vac",
  "ho_tro_xang_xe",
  "thue_tncn_nam_2024",
  "tam_ung",
  "thue_tncn",
  "bhxh_bhtn_bhyt_total",
  "truy_thu_the_bhyt",
  "tien_luong_thuc_nhan_cuoi_ky",
];

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const includeData = searchParams.get("includeData") === "true";
    const salaryMonth = searchParams.get("salaryMonth");
    const configId = searchParams.get("configId");
    const timestampOnly = searchParams.get("timestamp_only") === "true";

    // Handle timestamp-only request for sync checking
    if (timestampOnly) {
      const { data: lastUpdated } = await supabase
        .from("mapping_configurations")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      return NextResponse.json({
        last_updated: lastUpdated?.updated_at
          ? new Date(lastUpdated.updated_at).getTime()
          : 0,
      });
    }

    // Load mapping configuration if specified
    let mappingConfig = null;
    const customHeaders: Record<string, string> = {};

    if (configId) {
      const { data: config, error: configError } = await supabase
        .from("mapping_configurations")
        .select(
          `
          *,
          configuration_field_mappings (
            database_field,
            excel_column_name,
            confidence_score,
            mapping_type
          )
        `,
        )
        .eq("id", configId)
        .eq("is_active", true)
        .single();

      if (!configError && config) {
        mappingConfig = config;

        interface FieldMapping {
          database_field: string;
          excel_column_name: string;
        }

        // Create custom headers from mapping configuration
        if (config.configuration_field_mappings) {
          (config.configuration_field_mappings as FieldMapping[]).forEach(
            (mapping) => {
              customHeaders[mapping.database_field] = mapping.excel_column_name;
            },
          );
        }
      }
    }

    // Analyze which columns have data (non-null, non-zero values)
    const { data: columnAnalysis, error: analysisError } = await supabase.rpc(
      "analyze_payroll_columns",
    );

    let activeFields = PAYROLL_FIELDS;

    if (!analysisError && columnAnalysis) {
      interface ColumnAnalysis {
        column_name: string;
        non_null_count: number;
        non_zero_count: number;
      }

      // Filter out columns that are completely empty
      activeFields = PAYROLL_FIELDS.filter((field) => {
        if (field === "employee_id" || field === "salary_month") return true; // Always include required fields
        const analysis = (columnAnalysis as ColumnAnalysis[]).find(
          (col) => col.column_name === field,
        );
        return (
          analysis &&
          (analysis.non_null_count > 0 || analysis.non_zero_count > 0)
        );
      });
    }

    interface MappingConfig {
      configuration_field_mappings?: Array<{ database_field: string }>;
    }

    // If mapping config is provided, prioritize fields from the configuration
    if (
      mappingConfig &&
      (mappingConfig as MappingConfig).configuration_field_mappings
    ) {
      const configFields = (
        mappingConfig as MappingConfig
      ).configuration_field_mappings!.map((m) => m.database_field);
      // Include both active fields and config fields, removing duplicates
      activeFields = [...new Set([...activeFields, ...configFields])].filter(
        (field) => PAYROLL_FIELDS.includes(field),
      ); // Ensure field exists in schema
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare headers with mapping configuration support
    const headers = activeFields.map((field) => {
      // Priority: Custom headers from mapping config > Default headers > Field name
      return customHeaders[field] || FIELD_HEADERS[field] || field;
    });

    // Prepare data rows
    let dataRows: unknown[][] = [];

    if (includeData) {
      // Get sample data or specific month data
      let query = supabase
        .from("payrolls")
        .select(activeFields.join(","))
        .order("created_at", { ascending: false });

      if (salaryMonth) {
        query = query.eq("salary_month", salaryMonth);
      } else {
        query = query.limit(100); // Limit to 100 records for template
      }

      const { data: payrollData, error: dataError } = await query;

      if (!dataError && payrollData) {
        dataRows = payrollData.map((record) =>
          activeFields.map(
            (field) => (record as Record<string, unknown>)[field] || "",
          ),
        );
      }
    } else {
      // Add sample rows for template
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const sampleRow1 = activeFields.map((field) => {
        if (field === "employee_id") return "NV001";
        if (field === "salary_month") return currentMonth;
        if (field === "tien_luong_thuc_nhan_cuoi_ky") return 15000000;
        if (field.includes("he_so")) return 1.0;
        if (field.includes("luong") || field.includes("tien")) return 5000000;
        return "";
      });

      const sampleRow2 = activeFields.map((field) => {
        if (field === "employee_id") return "NV002";
        if (field === "salary_month") return currentMonth;
        if (field === "tien_luong_thuc_nhan_cuoi_ky") return 12000000;
        if (field.includes("he_so")) return 1.0;
        if (field.includes("luong") || field.includes("tien")) return 4000000;
        return "";
      });

      dataRows = [sampleRow1, sampleRow2];
    }

    // Create worksheet data
    const worksheetData = [headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = headers.map(() => ({ width: 20 }));
    worksheet["!cols"] = columnWidths;

    // Add worksheet to workbook
    const sheetName = includeData
      ? `Lương ${salaryMonth || "Tất cả"}`
      : "Template Lương";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create filename with mapping config info
    const vietnamTime = getVietnamTimestamp();
    const timestamp = vietnamTime.slice(0, 10);
    const configSuffix = mappingConfig
      ? `-${mappingConfig.config_name.replace(/\s+/g, "-")}`
      : "";
    const filename = includeData
      ? `luong-export-${salaryMonth || "all"}${configSuffix}-${timestamp}.xlsx`
      : `template-luong${configSuffix}-${timestamp}.xlsx`;

    // Prepare response headers
    const responseHeaders: Record<string, string> = {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": excelBuffer.length.toString(),
    };

    // Add mapping configuration metadata to headers
    if (mappingConfig) {
      responseHeaders["X-Mapping-Config-Id"] = mappingConfig.id.toString();
      responseHeaders["X-Mapping-Config-Name"] = mappingConfig.config_name;
      responseHeaders["X-Mapping-Config-Fields"] =
        activeFields.length.toString();
      responseHeaders["X-Custom-Headers-Count"] =
        Object.keys(customHeaders).length.toString();
    }

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Export template error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tạo template export" },
      { status: 500 },
    );
  }
}
