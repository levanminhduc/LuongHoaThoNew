import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import XLSX from "xlsx-js-style";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

interface OvertimeExportBody {
  period_year: number;
  period_month: number;
}

interface DailyExportRecord {
  day: number;
  checkOut: string;
}

function formatTimeHHmm(timeStr: string | null): string {
  if (!timeStr) return "";
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return timeStr;
}

function normalizeDailyRecords(value: unknown): DailyExportRecord[] {
  let rawValue = value;
  if (typeof rawValue === "string") {
    try {
      rawValue = JSON.parse(rawValue);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rawValue)) return [];

  return rawValue.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const rawDay =
      "day" in item ? item.day : "work_day" in item ? item.work_day : undefined;
    const day =
      typeof rawDay === "number"
        ? rawDay
        : Number.parseInt(String(rawDay ?? ""), 10);
    if (!Number.isInteger(day) || day < 1 || day > 31) return [];

    const rawCheckOut =
      "checkOut" in item
        ? item.checkOut
        : "check_out_time" in item
          ? item.check_out_time
          : null;

    return [
      {
        day,
        checkOut:
          typeof rawCheckOut === "string" ? formatTimeHHmm(rawCheckOut) : "",
      },
    ];
  });
}

function naturalSortDepartments(a: string, b: string): number {
  const xtPattern = /^XT(\d+)$/i;
  const matchA = a.match(xtPattern);
  const matchB = b.match(xtPattern);
  if (matchA && matchB)
    return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
  if (matchA && !matchB) return -1;
  if (!matchA && matchB) return 1;
  return a.localeCompare(b, "vi", { sensitivity: "base" });
}

const TOTAL_COLS = 6 + 31;

const border = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" },
};

const headerStyle = {
  font: { bold: true, sz: 11, name: "Times New Roman" },
  alignment: {
    horizontal: "center" as const,
    vertical: "center" as const,
    wrapText: true,
  },
  border,
};

const dataStyle = {
  font: { sz: 11, name: "Times New Roman" },
  alignment: { horizontal: "center" as const, vertical: "center" as const },
  border,
};

const deptStyle = {
  font: {
    bold: true,
    sz: 11,
    name: "Times New Roman",
    color: { rgb: "1F4E79" },
  },
  alignment: { horizontal: "left" as const, vertical: "center" as const },
  border,
};

const titleStyle = {
  font: { bold: true, sz: 14, name: "Times New Roman" },
  alignment: { horizontal: "center" as const, vertical: "center" as const },
};

const companyStyle = {
  font: { bold: true, sz: 11, name: "Times New Roman" },
  alignment: { horizontal: "center" as const, vertical: "center" as const },
};

const subtitleStyle = {
  font: { sz: 11, name: "Times New Roman" },
  alignment: { horizontal: "center" as const, vertical: "center" as const },
};

const bodyTextStyle = {
  font: { sz: 10, name: "Times New Roman" },
  alignment: {
    horizontal: "left" as const,
    vertical: "center" as const,
    wrapText: true,
  },
};

function buildWorkbook(
  sortedDepts: [
    string,
    { employee_id: string; full_name: string; department: string }[],
  ][],
  checkOutByEmployee: Map<string, Map<number, string>>,
  daysInMonth: number,
  periodYear: number,
  periodMonth: number,
): XLSX.WorkBook {
  const rows: (string | number)[][] = [];
  const merges: XLSX.Range[] = [];

  const row0 = Array(TOTAL_COLS).fill("");
  row0[0] = "TỔNG CÔNG TY CP DỆT MAY HÒA THỌ";
  row0[8] = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
  rows.push(row0);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
  merges.push({ s: { r: 0, c: 8 }, e: { r: 0, c: TOTAL_COLS - 1 } });

  const row1 = Array(TOTAL_COLS).fill("");
  row1[0] = "CÔNG TY MAY HÒA THỌ - ĐIỆN BÀN";
  row1[8] = "Độc Lập - Tự Do - Hạnh Phúc";
  rows.push(row1);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
  merges.push({ s: { r: 1, c: 8 }, e: { r: 1, c: TOTAL_COLS - 1 } });

  rows.push(Array(TOTAL_COLS).fill(""));

  const row3 = Array(TOTAL_COLS).fill("");
  row3[0] = "BẢNG ĐĂNG KÝ TĂNG CA TỰ NGUYỆN";
  rows.push(row3);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } });

  const row4 = Array(TOTAL_COLS).fill("");
  const mm = String(periodMonth).padStart(2, "0");
  row4[0] = `THÁNG ${mm} / ${periodYear}`;
  rows.push(row4);
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } });

  rows.push(Array(TOTAL_COLS).fill(""));

  const text1 =
    "Qua sự bàn bạc, thống nhất giữa Lãnh đạo và đại diện người lao động của Công ty, nhằm nâng cao thu nhập cho CBCNV cũng như đảm bảo năng lực sản xuất,";
  const text2 = "Công ty sẽ tổ chức làm thêm trên cơ sở hoàn toàn tự nguyện.";
  const text3 =
    "Nếu CBNV đồng ý làm thêm giờ thì tự nguyện ký vào bảng đăng ký tăng ca tự nguyện sau:";

  for (const txt of [text1, text2, text3]) {
    const row = Array(TOTAL_COLS).fill("");
    row[4] = txt;
    rows.push(row);
    merges.push({
      s: { r: rows.length - 1, c: 4 },
      e: { r: rows.length - 1, c: TOTAL_COLS - 1 },
    });
  }

  rows.push(Array(TOTAL_COLS).fill(""));

  const HEADER_ROW = rows.length;
  const headerRow = Array(TOTAL_COLS).fill("");
  headerRow[0] = "MS\nNV";
  headerRow[4] = "HỌ VÀ TÊN";
  for (let d = 1; d <= 31; d++) {
    headerRow[5 + d] = d <= daysInMonth ? d : "";
  }
  rows.push(headerRow);

  const SUB_HEADER_ROW = rows.length;
  const subHeaderRow = Array(TOTAL_COLS).fill("");
  for (let d = 1; d <= daysInMonth; d++) {
    subHeaderRow[5 + d] = "16h30-\n17h00";
  }
  rows.push(subHeaderRow);

  merges.push({ s: { r: HEADER_ROW, c: 0 }, e: { r: SUB_HEADER_ROW, c: 3 } });
  merges.push({ s: { r: HEADER_ROW, c: 4 }, e: { r: SUB_HEADER_ROW, c: 5 } });

  const deptRowIndices: number[] = [];

  for (const [dept, empList] of sortedDepts) {
    const deptRowIdx = rows.length;
    deptRowIndices.push(deptRowIdx);
    const deptRow = Array(TOTAL_COLS).fill("");
    deptRow[4] = `TỔ ${dept}`;
    rows.push(deptRow);
    merges.push({
      s: { r: deptRowIdx, c: 0 },
      e: { r: deptRowIdx, c: TOTAL_COLS - 1 },
    });

    for (const emp of empList) {
      const dataRow = Array(TOTAL_COLS).fill("");
      const shortId = emp.employee_id.replace(/^DB0*/, "");
      dataRow[0] = shortId;
      dataRow[2] = emp.employee_id;
      dataRow[3] = emp.department;
      const nameParts = emp.full_name.split(" ");
      const lastName = nameParts.pop() || "";
      const firstName = nameParts.join(" ");
      dataRow[4] = firstName;
      dataRow[5] = lastName.toUpperCase();

      const dayMap = checkOutByEmployee.get(emp.employee_id) || new Map();
      for (let d = 1; d <= daysInMonth; d++) {
        const checkOut = dayMap.get(d);
        if (checkOut && checkOut >= "16:30") {
          dataRow[5 + d] = 1;
        }
      }

      rows.push(dataRow);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;

  const cols: XLSX.ColInfo[] = [];
  cols[0] = { wch: 5 };
  cols[1] = { wch: 2 };
  cols[2] = { wch: 10 };
  cols[3] = { wch: 5 };
  cols[4] = { wch: 18 };
  cols[5] = { wch: 10 };
  for (let d = 1; d <= 31; d++) {
    cols[5 + d] = { wch: 4.5 };
  }
  ws["!cols"] = cols;

  const totalRows = rows.length;
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < TOTAL_COLS; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) ws[cellRef] = { v: "", t: "s" };

      if (r === 0) {
        ws[cellRef].s = companyStyle;
      } else if (r === 1) {
        ws[cellRef].s = subtitleStyle;
      } else if (r === 3) {
        ws[cellRef].s = titleStyle;
      } else if (r === 4) {
        ws[cellRef].s = subtitleStyle;
      } else if (r >= 6 && r <= 8) {
        ws[cellRef].s = bodyTextStyle;
      } else if (r === HEADER_ROW || r === SUB_HEADER_ROW) {
        ws[cellRef].s = headerStyle;
      } else if (deptRowIndices.includes(r)) {
        ws[cellRef].s = deptStyle;
      } else if (r > SUB_HEADER_ROW) {
        ws[cellRef].s = dataStyle;
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tăng Ca Tự Nguyện");
  return wb;
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    const body: OvertimeExportBody = await request.json();
    const { period_year, period_month } = body;

    if (
      !period_year ||
      !period_month ||
      period_month < 1 ||
      period_month > 12 ||
      period_year < 2000 ||
      period_year > 2100
    ) {
      return NextResponse.json(
        { error: "Thiếu hoặc sai tham số period_year/period_month" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();
    const daysInMonth = new Date(period_year, period_month, 0).getDate();

    const { data: monthlyData, error: monthlyError } = await supabase
      .from("attendance_monthly")
      .select("employee_id, daily_records_json")
      .eq("period_year", period_year)
      .eq("period_month", period_month);

    if (monthlyError) {
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu chấm công" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }
    if (!monthlyData || monthlyData.length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu để xuất" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    const employeeIds = monthlyData.map((m) => m.employee_id);
    const { data: employees } = await supabase
      .from("employees")
      .select("employee_id, full_name, department")
      .in("employee_id", employeeIds);

    const employeeMap = new Map(
      (employees || []).map((e) => [e.employee_id, e]),
    );

    const checkOutByEmployee = new Map<string, Map<number, string>>();
    const fallbackIds: string[] = [];

    for (const m of monthlyData) {
      const dayMap = new Map<number, string>();
      const records = normalizeDailyRecords(m.daily_records_json);

      if (m.daily_records_json == null) {
        fallbackIds.push(m.employee_id);
      }

      for (const rec of records) {
        if (rec.checkOut) dayMap.set(rec.day, rec.checkOut);
      }
      checkOutByEmployee.set(m.employee_id, dayMap);
    }

    if (fallbackIds.length > 0) {
      const { data: fallbackData } = await supabase
        .from("attendance_daily")
        .select("employee_id, work_date, check_out_time")
        .eq("period_year", period_year)
        .eq("period_month", period_month)
        .in("employee_id", fallbackIds);

      for (const d of fallbackData || []) {
        const dayNum = new Date(d.work_date).getDate();
        if (!checkOutByEmployee.has(d.employee_id)) {
          checkOutByEmployee.set(d.employee_id, new Map());
        }
        const formatted = formatTimeHHmm(d.check_out_time);
        if (formatted)
          checkOutByEmployee.get(d.employee_id)!.set(dayNum, formatted);
      }
    }

    const byDept = new Map<
      string,
      { employee_id: string; full_name: string; department: string }[]
    >();
    for (const m of monthlyData) {
      const emp = employeeMap.get(m.employee_id);
      const dept = emp?.department || "Không xác định";
      if (!byDept.has(dept)) byDept.set(dept, []);
      byDept.get(dept)!.push({
        employee_id: m.employee_id,
        full_name: emp?.full_name || "",
        department: dept,
      });
    }

    const sortedDepts = Array.from(byDept.entries()).sort(([a], [b]) =>
      naturalSortDepartments(a, b),
    );

    const workbook = buildWorkbook(
      sortedDepts,
      checkOutByEmployee,
      daysInMonth,
      period_year,
      period_month,
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const mm = String(period_month).padStart(2, "0");
    const filename = `TangCaTuNguyen_${period_year}-${mm}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        ...CACHE_HEADERS.sensitive,
      },
    });
  } catch (error) {
    console.error("Overtime registration export error:", error);
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi xuất file",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
