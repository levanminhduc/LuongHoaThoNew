import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import XLSX from "xlsx-js-style";

// All 39 payroll fields from database
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
  "ngay_cong_chu_nhat",
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
  "pc_luong_cho_viec",
  "tien_luong_chu_nhat",
  "luong_cnkcp_vuot",
  "tien_tang_ca_vuot",
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

// Field headers in Vietnamese
const FIELD_HEADERS: Record<string, string> = {
  employee_id: "Mã Nhân Viên",
  salary_month: "Họ Và Tên",
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
  tong_luong_san_pham_cong_doan: "Tổng Lương Sản Phẩm Công Đoàn",
  don_gia_tien_luong_tren_gio: "Đơn Giá Tiền Lương Trên Giờ",
  tien_luong_san_pham_trong_gio: "Tiền Lương Sản Phẩm Trong Giờ",
  tien_luong_tang_ca: "Tiền Lương Tăng Ca",
  tien_luong_30p_an_ca: "Tiền Lương 30p Ăn Ca",
  tien_khen_thuong_chuyen_can: "Tiền Khen Thưởng Chuyên Cần",
  luong_hoc_viec_pc_luong: "Lương Học Việc PC Lương",
  tong_cong_tien_luong_san_pham: "Tổng Cộng Tiền Lương Sản Phẩm",
  ho_tro_thoi_tiet_nong: "Hỗ Trợ Thời Tiết Nóng",
  bo_sung_luong: "Bổ Sung Lương",
  pc_luong_cho_viec: "PC Lương Cho Việc",
  tien_luong_chu_nhat: "Tiền Lương Chủ Nhật",
  luong_cnkcp_vuot: "Lương CNKCP Vượt",
  tien_tang_ca_vuot: "Tiền Tăng Ca Vượt",
  bhxh_21_5_percent: "BHXH 21.5%",
  pc_cdcs_pccc_atvsv: "PC CDCS PCCC ATVSV",
  luong_phu_nu_hanh_kinh: "Lương Phụ Nữ Hành Kinh",
  tien_con_bu_thai_7_thang: "Tiền Con Bú Thai 7 Tháng",
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
    // Verify authentication
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    // Check role permissions
    if (
      ![
        "admin",
        "giam_doc",
        "ke_toan",
        "nguoi_lap_bieu",
        "truong_phong",
        "to_truong",
      ].includes(auth.user.role)
    ) {
      return NextResponse.json(
        { error: "Không có quyền xuất dữ liệu" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const month = searchParams.get("month");
    const department = searchParams.get("department");
    const payrollType = searchParams.get("payroll_type") || "monthly";
    const isT13 = payrollType === "t13";

    let query = supabase
      .from("payrolls")
      .select(
        `
        *,
        employees!payrolls_employee_id_fkey!inner(
          full_name,
          department
        )
      `,
      )
      .order("employee_id");

    if (isT13) {
      query = query.eq("payroll_type", "t13");
    } else {
      query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    if (month) {
      query = query.eq("salary_month", month);
    }

    // Apply role-based department filtering
    if (
      ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
        auth.user.role,
      )
    ) {
      // Management roles can only access allowed departments
      const allowedDepartments = auth.user.allowed_departments || [];
      if (allowedDepartments.length === 0) {
        return NextResponse.json(
          {
            error: "Chưa được phân quyền truy cập department nào",
          },
          { status: 403 },
        );
      }
      query = query.in("employees.department", allowedDepartments);

      // If specific department requested, check permission
      if (department && !allowedDepartments.includes(department)) {
        return NextResponse.json(
          {
            error: "Không có quyền truy cập department này",
          },
          { status: 403 },
        );
      }

      if (department) {
        query = query.eq("employees.department", department);
      }
    } else if (auth.user.role === "to_truong") {
      // Supervisor can only access own department
      query = query.eq("employees.department", auth.user.department);
    } else if (auth.user.role === "admin") {
      // Admin can access all, apply department filter if specified
      if (department) {
        query = query.eq("employees.department", department);
      }
    }

    // Debug: Check if we have any data first
    const { data: debugData, error: debugError } = await supabase
      .from("payrolls")
      .select("id, employee_id, salary_month")
      .limit(5);

    console.log("Debug - Payrolls table sample:", debugData);
    console.log("Debug - Payrolls error:", debugError);

    const { data: employeesDebug, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id, full_name, department")
      .limit(5);

    console.log("Debug - Employees table sample:", employeesDebug);
    console.log("Debug - Employees error:", employeesError);

    const queryResult = await query;
    let payrollData = queryResult.data;
    const error = queryResult.error;

    console.log("Query result - records count:", payrollData?.length || 0);
    console.log("Query params:", { month, department, role: auth.user.role });

    if (error) {
      console.error("Error fetching payroll data:", error);
      console.error("Query details:", {
        month,
        department,
        role: auth.user.role,
        allowed_departments: auth.user.allowed_departments,
        user_department: auth.user.department,
      });
      return NextResponse.json(
        {
          error: "Lỗi khi lấy dữ liệu lương",
          details: error.message,
          debug:
            process.env.NODE_ENV === "development"
              ? {
                  error,
                  debugData,
                  employeesDebug,
                  queryParams: { month, department },
                }
              : undefined,
        },
        { status: 500 },
      );
    }

    if (!payrollData || payrollData.length === 0) {
      // Try fallback query without join
      console.log("Trying fallback query without join...");

      let fallbackQuery = supabase
        .from("payrolls")
        .select("*")
        .order("employee_id");

      // Apply same filters
      if (month) {
        fallbackQuery = fallbackQuery.eq("salary_month", month);
      }

      // Skip role-based filtering in fallback for now
      console.log("Fallback query - skipping role-based filtering");

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        // Check what months are available
        const { data: availableMonths } = await supabase
          .from("payrolls")
          .select("salary_month")
          .order("salary_month", { ascending: false })
          .limit(10);

        const uniqueMonths = [
          ...new Set(availableMonths?.map((p) => p.salary_month) || []),
        ];

        return NextResponse.json(
          {
            error: "Không có dữ liệu lương để xuất",
            message: month
              ? `Không có dữ liệu lương cho tháng ${month}${department ? ` của department ${department}` : ""}`
              : "Không có dữ liệu lương trong hệ thống",
            availableMonths: uniqueMonths.slice(0, 5),
            suggestion:
              uniqueMonths.length > 0
                ? `Thử xuất dữ liệu cho tháng: ${uniqueMonths.slice(0, 3).join(", ")}`
                : "Vui lòng import dữ liệu lương trước khi xuất Excel",
            debug:
              process.env.NODE_ENV === "development"
                ? {
                    fallbackError,
                    originalError: error,
                    queryParams: { month, department },
                    availableMonths: uniqueMonths,
                  }
                : undefined,
          },
          { status: 404 },
        );
      }

      // Get employee data separately
      const { data: employeesData } = await supabase
        .from("employees")
        .select("employee_id, full_name, department");

      // Merge data manually
      const mergedData = fallbackData.map((payroll) => {
        const employee = employeesData?.find(
          (emp) => emp.employee_id === payroll.employee_id,
        );
        return {
          ...payroll,
          employees: employee
            ? {
                full_name: employee.full_name,
                department: employee.department,
              }
            : null,
        };
      });

      // Apply department filtering for role-based access
      let filteredData = mergedData;
      if (
        ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
          auth.user.role,
        )
      ) {
        const allowedDepartments = auth.user.allowed_departments || [];
        filteredData = mergedData.filter(
          (record) =>
            record.employees &&
            allowedDepartments.includes(record.employees.department),
        );

        if (department) {
          filteredData = filteredData.filter(
            (record) =>
              record.employees && record.employees.department === department,
          );
        }
      } else if (auth.user.role === "to_truong") {
        filteredData = mergedData.filter(
          (record) =>
            record.employees &&
            record.employees.department === auth.user.department,
        );
      } else if (auth.user.role === "admin" && department) {
        filteredData = mergedData.filter(
          (record) =>
            record.employees && record.employees.department === department,
        );
      }

      if (filteredData.length === 0) {
        return NextResponse.json(
          { error: "Không có dữ liệu để xuất" },
          { status: 404 },
        );
      }

      // Use filtered data for export
      payrollData = filteredData;
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare headers (all 39 fields + Ký Tên + Ngày Ký columns)
    const headers = [
      "STT",
      ...PAYROLL_FIELDS.map((field) => FIELD_HEADERS[field] || field),
      "Ký Tên",
      "Ngày Ký",
    ];

    interface PayrollRecord {
      [key: string]: unknown;
      employee_id?: string;
      is_signed?: boolean;
      employees?: {
        full_name?: string;
      } | null;
    }

    interface SignatureLog {
      employee_id: string;
      salary_month: string;
      signed_by_name: string;
      signed_at: string;
    }

    interface ManagementSignature {
      full_name?: string;
      signature_image_url?: string;
      signed_by_name?: string;
    }

    const formatSignedAtDate = (signedAt: string | null): string => {
      if (!signedAt) return "";
      try {
        const date = new Date(signedAt);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const monthNum = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${monthNum}/${year}`;
      } catch {
        return "";
      }
    };

    const signatureLogsMap = new Map<string, SignatureLog>();
    if (month) {
      try {
        const { data: signatureLogs, error: sigLogsError } = await supabase
          .from("signature_logs")
          .select("employee_id, salary_month, signed_by_name, signed_at")
          .eq("salary_month", month);

        if (!sigLogsError && signatureLogs) {
          signatureLogs.forEach((log) => {
            signatureLogsMap.set(log.employee_id, log as SignatureLog);
          });
        }
      } catch (error) {
        console.log("Could not fetch signature_logs - using fallback");
      }
    }

    const dataRows = payrollData.map((record: PayrollRecord, index: number) => {
      const row: unknown[] = [index + 1];

      PAYROLL_FIELDS.forEach((field) => {
        if (field === "salary_month") {
          row.push(record.employees?.full_name || "");
        } else {
          row.push(record[field] || "");
        }
      });

      const employeeId = record.employee_id as string;
      const signatureLog = signatureLogsMap.get(employeeId);

      if (signatureLog) {
        row.push(signatureLog.signed_by_name || "");
        row.push(formatSignedAtDate(signatureLog.signed_at));
      } else if (record.is_signed) {
        row.push(record.employees?.full_name || "N/A");
        row.push("");
      } else {
        row.push("Chưa Ký");
        row.push("");
      }

      return row;
    });

    // Fetch management signatures for the month
    const managementSignatures: {
      giam_doc: ManagementSignature | null;
      ke_toan: ManagementSignature | null;
      nguoi_lap_bieu: ManagementSignature | null;
    } = {
      giam_doc: null,
      ke_toan: null,
      nguoi_lap_bieu: null,
    };

    if (month) {
      try {
        const { data: signatures, error: sigError } = await supabase
          .from("management_signatures")
          .select("*")
          .eq("salary_month", month)
          .eq("is_active", true);

        if (!sigError && signatures) {
          signatures.forEach((sig) => {
            managementSignatures[
              sig.signature_type as keyof typeof managementSignatures
            ] = sig;
          });
        }
      } catch (error) {
        console.log(
          "Management signatures table not available - using fallback",
        );
      }
    }

    const formatMonthDisplay = (monthParam: string | null): string => {
      if (!monthParam || !monthParam.match(/^\d{4}-\d{2}$/)) {
        return "Tháng ... năm .....";
      }
      const [yearPart, monthPart] = monthParam.split("-");
      return `Tháng ${monthPart} năm ${yearPart}`;
    };

    // Create title rows (5 rows total)
    const totalColumns = headers.length; // 41 columns
    const titleRows = [];

    // Row 1: Empty
    titleRows.push(new Array(totalColumns).fill(""));

    // Row 2: Empty
    titleRows.push(new Array(totalColumns).fill(""));

    const row3 = new Array(totalColumns).fill("");
    row3[0] = "TỔNG CTY CP DỆT MAY HÒA THỌ";
    row3[15] = isT13
      ? "BẢNG THANH TOÁN LƯƠNG THÁNG 13"
      : "BẢNG THANH TOÁN TIỀN LƯƠNG";
    titleRows.push(row3);

    // Row 4: Company branch in A4, Month/Year in P4 (index 15)
    const row4 = new Array(totalColumns).fill("");
    row4[0] = "CTY MAY HÒA THỌ - ĐIỆN BÀN";
    row4[15] = formatMonthDisplay(month);
    titleRows.push(row4);

    // Row 5: Department info in P5 (index 15)
    const row5 = new Array(totalColumns).fill("");
    row5[15] = department ? `PHÒNG BAN: ${department}` : "PHÒNG BAN: TẤT CẢ";
    titleRows.push(row5);

    // Create worksheet data with title rows, headers, and data
    console.log(
      "Creating worksheet with headers:",
      headers.length,
      "and data rows:",
      dataRows.length,
    );
    const worksheetData = [...titleRows, headers, ...dataRows];

    // Calculate signature column positions based on total columns
    const leftCol = 0; // Column A (Giám Đốc)
    const centerCol = Math.floor(totalColumns / 2); // Center column (Kế Toán)
    const rightCol = totalColumns - 1; // Last column (Người Lập Biểu)

    // Add signature section
    const signatureStartRow = worksheetData.length + 2;

    // Add signature headers
    worksheetData.push([]); // Empty row
    worksheetData.push([]); // Empty row

    // Signature headers row
    const signatureHeaderRow = new Array(totalColumns).fill("");
    signatureHeaderRow[leftCol] = "Giám Đốc";
    signatureHeaderRow[centerCol] = "Kế Toán";
    signatureHeaderRow[rightCol] = "Người Lập Biểu";
    worksheetData.push(signatureHeaderRow);

    // Add 4 empty rows for manual signature space
    worksheetData.push([]);
    worksheetData.push([]);
    worksheetData.push([]);
    worksheetData.push([]);

    // Signature data row
    const signatureDataRow = new Array(totalColumns).fill("");
    signatureDataRow[leftCol] = managementSignatures.giam_doc
      ? managementSignatures.giam_doc.signed_by_name
      : "Chưa ký";
    signatureDataRow[centerCol] = managementSignatures.ke_toan
      ? managementSignatures.ke_toan.signed_by_name
      : "Chưa ký";
    signatureDataRow[rightCol] = managementSignatures.nguoi_lap_bieu
      ? managementSignatures.nguoi_lap_bieu.signed_by_name
      : "Chưa ký";
    worksheetData.push(signatureDataRow);

    console.log("Worksheet data prepared, creating sheet...");
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    console.log("Worksheet created successfully");

    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    const headerStyle = {
      fill: {
        patternType: "solid",
        fgColor: { rgb: "4472C4" },
      },
      font: {
        bold: true,
        color: { rgb: "CCECFF" },
        sz: 10,
        name: "Arial",
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: borderStyle,
    };

    const dataCellStyle = {
      font: {
        sz: 10,
        name: "Arial",
      },
      alignment: {
        horizontal: "left",
        vertical: "center",
        wrapText: false,
      },
      border: borderStyle,
    };

    const numberCellStyle = {
      font: {
        sz: 10,
        name: "Arial",
      },
      alignment: {
        horizontal: "right",
        vertical: "center",
      },
      border: borderStyle,
      numFmt: "#,##0",
    };

    const columnWidths = headers.map(() => ({ wch: 12 }));
    worksheet["!cols"] = columnWidths;

    const headerRowIndex = 5;
    const rowHeights = [];
    for (let i = 0; i < headerRowIndex; i++) {
      rowHeights.push({ hpt: 20 });
    }
    rowHeights.push({ hpt: 65 });
    for (let i = 0; i < dataRows.length; i++) {
      rowHeights.push({ hpt: 25 });
    }
    for (let i = 0; i < 8; i++) {
      rowHeights.push({ hpt: 20 });
    }
    worksheet["!rows"] = rowHeights;

    const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "");
    const numericFields = [
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
      "pc_luong_cho_viec",
      "tien_luong_chu_nhat",
      "luong_cnkcp_vuot",
      "tien_tang_ca_vuot",
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

    const numericFieldHeaders = numericFields.map(
      (field) => FIELD_HEADERS[field] || field,
    );

    const titleStyle = {
      font: {
        sz: 14,
        name: "Arial",
      },
      alignment: {
        horizontal: "left",
        vertical: "center",
      },
    };

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });

        if (row < headerRowIndex) {
          if (
            worksheet[cellRef] &&
            worksheet[cellRef].v !== "" &&
            worksheet[cellRef].v !== null &&
            worksheet[cellRef].v !== undefined
          ) {
            worksheet[cellRef].s = titleStyle;
          } else {
            delete worksheet[cellRef];
          }
        } else if (row === headerRowIndex) {
          if (!worksheet[cellRef]) {
            worksheet[cellRef] = { t: "s", v: "" };
          }
          worksheet[cellRef].s = headerStyle;
        } else if (
          row > headerRowIndex &&
          row < headerRowIndex + 1 + dataRows.length
        ) {
          if (!worksheet[cellRef]) {
            worksheet[cellRef] = { t: "s", v: "" };
          }
          const headerText = headers[col];
          const isNumericColumn = numericFieldHeaders.includes(headerText);

          if (isNumericColumn && typeof worksheet[cellRef].v === "number") {
            worksheet[cellRef].s = numberCellStyle;
          } else {
            worksheet[cellRef].s = dataCellStyle;
          }
        } else {
          if (worksheet[cellRef] && !worksheet[cellRef].s) {
            worksheet[cellRef].s = {
              border: borderStyle,
              alignment: {
                horizontal: "center",
                vertical: "center",
              },
            };
          }
        }
      }
    }

    // Apply styling to signature section
    const signatureHeaderRowIndex = signatureStartRow + 1;
    const signatureDataRowIndex = signatureStartRow + 6;

    // Style signature headers (bold, centered, bottom border)
    const signatureHeaderCells = [
      XLSX.utils.encode_cell({ r: signatureHeaderRowIndex, c: leftCol }),
      XLSX.utils.encode_cell({ r: signatureHeaderRowIndex, c: centerCol }),
      XLSX.utils.encode_cell({ r: signatureHeaderRowIndex, c: rightCol }),
    ];

    signatureHeaderCells.forEach((cellRef) => {
      if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
      worksheet[cellRef].s = {
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: { bottom: { style: "thin", color: { rgb: "000000" } } },
      };
    });

    // Style signature data (italic, centered)
    const signatureDataCells = [
      XLSX.utils.encode_cell({ r: signatureDataRowIndex, c: leftCol }),
      XLSX.utils.encode_cell({ r: signatureDataRowIndex, c: centerCol }),
      XLSX.utils.encode_cell({ r: signatureDataRowIndex, c: rightCol }),
    ];

    signatureDataCells.forEach((cellRef) => {
      if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
      worksheet[cellRef].s = {
        font: { italic: true },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      };
    });

    // Apply styling to title cells
    const titleCells = [
      XLSX.utils.encode_cell({ r: 2, c: 0 }), // A3: Company name
      XLSX.utils.encode_cell({ r: 3, c: 0 }), // A4: Company branch
      XLSX.utils.encode_cell({ r: 2, c: 15 }), // P3: Report title
      XLSX.utils.encode_cell({ r: 3, c: 15 }), // P4: Month/Year
      XLSX.utils.encode_cell({ r: 4, c: 15 }), // P5: Department
    ];

    titleCells.forEach((cellRef) => {
      if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
      worksheet[cellRef].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "left", vertical: "center" },
      };
    });

    // Add worksheet to workbook
    const departmentName = department || "TatCa";
    const monthName = month || "TatCa";

    // Create ASCII-safe sheet name (max 31 chars)
    const safeDeptName = departmentName
      .replace(/[^\w\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "_"); // Replace spaces with underscores

    let sheetName = `${safeDeptName}_${monthName}`;
    if (sheetName.length > 31) {
      // Truncate department name if too long
      const maxDeptLength = 31 - monthName.length - 1; // -1 for underscore
      const shortDeptName = safeDeptName.substring(0, maxDeptLength);
      sheetName = `${shortDeptName}_${monthName}`;
    }

    console.log("Sheet name:", sheetName, "Length:", sheetName.length);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create meaningful filename (safe for download)
    const timestamp = new Date().toISOString().slice(0, 10);

    const safeDepartmentName = departmentName
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 20);

    const typePrefix = isT13 ? "Luong13" : "Luong";
    const filename = `${typePrefix}_${safeDepartmentName}_${monthName}_${timestamp}.xlsx`;
    console.log("Safe filename:", filename);

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Payroll export error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi xuất dữ liệu lương",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    );
  }
}
