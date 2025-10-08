import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyAdminToken } from "@/lib/auth-middleware";
import * as XLSX from "xlsx";

// All payroll fields from the database schema (39 fields + required fields)
const ALL_PAYROLL_FIELDS = [
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
  "ngay_cong_chu_nhat",
  "tien_luong_chu_nhat",
  "luong_cnkcp_vuot",
  "tien_tang_ca_vuot",
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

// Default Vietnamese headers for fields without aliases
const DEFAULT_FIELD_HEADERS: Record<string, string> = {
  employee_id: "Mã Nhân Viên",
  salary_month: "Tháng Lương",
  he_so_lam_viec: "Hệ Số Làm Việc",
  he_so_phu_cap_ket_qua: "Hệ Số Phụ Cấp Kết Quả",
  he_so_luong_co_ban: "Hệ Số Lương Cơ Bản",
  luong_toi_thieu_cty: "Lương Tối Thiểu Công Ty",
  ngay_cong_trong_gio: "Ngày Công Trong Giờ",
  gio_cong_tang_ca: "Giờ Công Tăng Ca",
  gio_an_ca: "Giờ Ăn Ca",
  tong_gio_lam_viec: "Tổng Giờ Làm Việc",
  tong_he_so_quy_doi: "Tổng Hệ Số Quy Đổi",
  ngay_cong_chu_nhat: "Ngày Công Chủ Nhật",
  tien_luong_chu_nhat: "Tiền Lương Chủ Nhật",
  luong_cnkcp_vuot: "Lương CNKCP Vượt",
  tien_tang_ca_vuot: "Tiền Tăng Ca Vượt",
  tong_luong_san_pham_cong_doan: "Tổng Lương Sản Phẩm Công Đoạn",
  don_gia_tien_luong_tren_gio: "Đơn Giá Tiền Lương Trên Giờ",
  tien_luong_san_pham_trong_gio: "Tiền Lương Sản Phẩm Trong Giờ",
  tien_luong_tang_ca: "Tiền Lương Tăng Ca",
  tien_luong_30p_an_ca: "Tiền Lương 30p Ăn Ca",
  tien_khen_thuong_chuyen_can: "Tiền Khen Thưởng Chuyên Cần",
  luong_hoc_viec_pc_luong: "Lương Học Việc PC Lương",
  tong_cong_tien_luong_san_pham: "Tổng Cộng Tiền Lương Sản Phẩm",
  ho_tro_thoi_tiet_nong: "Hỗ Trợ Thời Tiết Nóng",
  bo_sung_luong: "Bổ Sung Lương",
  bhxh_21_5_percent: "BHXH 21.5%",
  pc_cdcs_pccc_atvsv: "PC CDCS PCCC ATVSV",
  luong_phu_nu_hanh_kinh: "Lương Phụ Nữ Hành Kinh",
  tien_con_bu_thai_7_thang: "Tiền Con Bù Thai 7 Tháng",
  ho_tro_gui_con_nha_tre: "Hỗ Trợ Gửi Con Nhà Trẻ",
  ngay_cong_phep_le: "Ngày Công Phép Lễ",
  tien_phep_le: "Tiền Phép Lễ",
  tong_cong_tien_luong: "Tổng Cộng Tiền Lương",
  tien_boc_vac: "Tiền Bốc Vác",
  ho_tro_xang_xe: "Hỗ Trợ Xăng Xe",
  thue_tncn_nam_2024: "Thuế TNCN Năm 2024",
  tam_ung: "Tạm Ứng",
  thue_tncn: "Thuế TNCN",
  bhxh_bhtn_bhyt_total: "BHXH BHTN BHYT Total",
  truy_thu_the_bhyt: "Truy Thu Thẻ BHYT",
  tien_luong_thuc_nhan_cuoi_ky: "Tiền Lương Thực Nhận Cuối Kỳ",
};

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
    const { searchParams } = new URL(request.url);
    const includeData = searchParams.get("includeData") === "true";
    const salaryMonth = searchParams.get("salaryMonth");
    const fieldsParam = searchParams.get("fields");

    // Parse selected fields or use all fields
    const selectedFields = fieldsParam
      ? fieldsParam.split(",")
      : ALL_PAYROLL_FIELDS;

    // Load all active column aliases from database
    const { data: aliases, error: aliasError } = await supabase
      .from("column_aliases")
      .select("database_field, alias_name, confidence_score")
      .eq("is_active", true)
      .order("confidence_score", { ascending: false });

    if (aliasError) {
      console.error("Error loading aliases:", aliasError);
      return NextResponse.json(
        { error: "Lỗi khi tải column aliases" },
        { status: 500 },
      );
    }

    // Create alias mapping with highest confidence score for each field
    const aliasMap = new Map<string, string>();
    const aliasStats = {
      totalAliases: aliases?.length || 0,
      fieldsWithAliases: 0,
      fieldsWithoutAliases: 0,
    };

    // Process aliases - use highest confidence score for each database field
    if (aliases) {
      const fieldAliases = new Map<
        string,
        { alias: string; confidence: number }
      >();

      aliases.forEach((alias) => {
        const existing = fieldAliases.get(alias.database_field);
        if (!existing || alias.confidence_score > existing.confidence) {
          fieldAliases.set(alias.database_field, {
            alias: alias.alias_name,
            confidence: alias.confidence_score,
          });
        }
      });

      // Build final alias map
      fieldAliases.forEach((value, field) => {
        aliasMap.set(field, value.alias);
      });

      aliasStats.fieldsWithAliases = fieldAliases.size;
    }

    // Generate headers using aliases or default headers
    const headers = selectedFields.map((field) => {
      const aliasHeader = aliasMap.get(field);
      const defaultHeader = DEFAULT_FIELD_HEADERS[field];

      if (aliasHeader) {
        return aliasHeader;
      } else if (defaultHeader) {
        aliasStats.fieldsWithoutAliases++;
        return defaultHeader;
      } else {
        aliasStats.fieldsWithoutAliases++;
        return field; // Fallback to field name
      }
    });

    let dataRows: unknown[][] = [];

    if (includeData) {
      let query = supabase
        .from("payrolls")
        .select(selectedFields.join(","))
        .order("created_at", { ascending: false });

      if (salaryMonth) {
        query = query.eq("salary_month", salaryMonth);
      } else {
        query = query.limit(100);
      }

      const { data: payrollData, error: dataError } = await query;

      if (!dataError && payrollData) {
        dataRows = payrollData.map((record) =>
          selectedFields.map(
            (field) =>
              (record as Record<string, unknown>)[field] ?? ("" as unknown),
          ),
        );
      }
    } else {
      // Generate sample data rows for template
      const sampleData = [
        selectedFields.map((field) => {
          if (field === "employee_id") return "EMP001";
          if (field === "salary_month") return "2025-01";
          if (field.includes("he_so")) return "1.0";
          if (field.includes("ngay_cong")) return "22";
          if (field.includes("gio")) return "8.0";
          if (field.includes("tien") || field.includes("luong"))
            return "5000000";
          return "0";
        }),
        selectedFields.map((field) => {
          if (field === "employee_id") return "EMP002";
          if (field === "salary_month") return "2025-01";
          if (field.includes("he_so")) return "1.2";
          if (field.includes("ngay_cong")) return "24";
          if (field.includes("gio")) return "10.0";
          if (field.includes("tien") || field.includes("luong"))
            return "6000000";
          return "0";
        }),
      ];
      dataRows = sampleData;
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet data
    const worksheetData = [headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = headers.map(() => ({ width: 25 }));
    worksheet["!cols"] = columnWidths;

    // Add worksheet to workbook
    const sheetName = includeData
      ? `Lương ${salaryMonth || "Tất cả"}`
      : "Template Lương Aliases";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = includeData
      ? `luong-export-aliases-${salaryMonth || "all"}-${timestamp}.xlsx`
      : `template-luong-aliases-${timestamp}.xlsx`;

    // Prepare response headers with alias statistics
    const responseHeaders: Record<string, string> = {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": excelBuffer.length.toString(),
      "X-Template-Type": "alias-based",
      "X-Total-Fields": selectedFields.length.toString(),
      "X-Total-Aliases": aliasStats.totalAliases.toString(),
      "X-Fields-With-Aliases": aliasStats.fieldsWithAliases.toString(),
      "X-Fields-Without-Aliases": aliasStats.fieldsWithoutAliases.toString(),
      "X-Alias-Coverage": `${((aliasStats.fieldsWithAliases / selectedFields.length) * 100).toFixed(1)}%`,
    };

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Generate alias template error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tạo template từ aliases" },
      { status: 500 },
    );
  }
}
