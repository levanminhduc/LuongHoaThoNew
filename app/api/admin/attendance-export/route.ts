import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import XLSX from "xlsx-js-style";

interface ExportRequestBody {
  period_year: number;
  period_month: number;
  employee_ids?: string[] | null;
  export_type: "selected" | "all";
  include_daily?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const body: ExportRequestBody = await request.json();
    const {
      period_year,
      period_month,
      employee_ids,
      export_type,
      include_daily = false,
    } = body;

    if (
      !period_year ||
      !period_month ||
      period_month < 1 ||
      period_month > 12
    ) {
      return NextResponse.json(
        { error: "Thiếu hoặc sai tham số period_year/period_month" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    let monthlyQuery = supabase
      .from("attendance_monthly")
      .select("*")
      .eq("period_year", period_year)
      .eq("period_month", period_month);

    if (export_type === "selected" && employee_ids && employee_ids.length > 0) {
      monthlyQuery = monthlyQuery.in("employee_id", employee_ids);
    }

    const { data: monthlyData, error: monthlyError } = await monthlyQuery;

    if (monthlyError) {
      console.error("Monthly query error:", monthlyError);
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu chấm công" },
        { status: 500 },
      );
    }

    if (!monthlyData || monthlyData.length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu để xuất" },
        { status: 404 },
      );
    }

    const employeeIds = monthlyData.map((m) => m.employee_id);

    const { data: employees } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu")
      .in("employee_id", employeeIds);

    const employeeMap = new Map(
      (employees || []).map((e) => [e.employee_id, e]),
    );

    interface SignatureLog {
      employee_id: string;
      salary_month: string;
      signed_by_name: string;
      signed_at: string;
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

    const salaryMonth = `${period_year}-${String(period_month).padStart(2, "0")}`;
    const signatureLogsMap = new Map<string, SignatureLog>();

    try {
      const { data: signatureLogs, error: sigLogsError } = await supabase
        .from("signature_logs")
        .select("employee_id, salary_month, signed_by_name, signed_at")
        .eq("salary_month", salaryMonth);

      if (!sigLogsError && signatureLogs) {
        signatureLogs.forEach((log) => {
          signatureLogsMap.set(log.employee_id, log as SignatureLog);
        });
      }
    } catch {
      console.log("Could not fetch signature_logs - using fallback");
    }

    const workbook = XLSX.utils.book_new();

    const summaryHeaders = [
      "STT",
      "Mã NV",
      "Họ Tên",
      "Phòng Ban",
      "Chức Vụ",
      "Tổng Giờ Công",
      "Tổng Ngày Công",
      "Giờ Ăn TC",
      "Giờ Tăng Ca",
      "Nghỉ Ốm",
      "File Nguồn",
      "Ký Tên",
      "Ngày Ký",
    ];

    const summaryRows = monthlyData.map((m, idx) => {
      const emp = employeeMap.get(m.employee_id);
      const signatureLog = signatureLogsMap.get(m.employee_id);

      return [
        idx + 1,
        m.employee_id,
        emp?.full_name || "",
        emp?.department || "",
        emp?.chuc_vu || "",
        m.total_hours,
        m.total_days,
        m.total_meal_ot_hours,
        m.total_ot_hours,
        m.sick_days,
        m.source_file || "",
        signatureLog?.signed_by_name || "Chưa Ký",
        formatSignedAtDate(signatureLog?.signed_at || null),
      ];
    });

    const summarySheet = XLSX.utils.aoa_to_sheet([
      summaryHeaders,
      ...summaryRows,
    ]);
    summarySheet["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng Hợp Tháng");

    if (include_daily) {
      let dailyQuery = supabase
        .from("attendance_daily")
        .select("*")
        .eq("period_year", period_year)
        .eq("period_month", period_month)
        .order("employee_id")
        .order("work_date");

      if (
        export_type === "selected" &&
        employee_ids &&
        employee_ids.length > 0
      ) {
        dailyQuery = dailyQuery.in("employee_id", employee_ids);
      }

      const { data: dailyData } = await dailyQuery;

      if (dailyData && dailyData.length > 0) {
        const daysInMonth = new Date(period_year, period_month, 0).getDate();

        const formatTimeHHmm = (timeStr: string | null): string => {
          if (!timeStr) return "";
          const match = timeStr.match(/(\d{1,2}):(\d{2})/);
          if (match) {
            return `${match[1].padStart(2, "0")}:${match[2]}`;
          }
          return timeStr;
        };

        const headerRow: (string | number)[] = [
          "STT",
          "Mã NV",
          "Tên Nhân Viên",
        ];

        for (let d = 1; d <= daysInMonth; d++) {
          headerRow.push(d, "");
        }
        headerRow.push(
          "Tổng Ngày Công",
          "Tổng Giờ Công",
          "Tổng Giờ Ăn TC",
          "Tổng Giờ Tăng Ca",
          "Nghỉ Ốm",
          "Ký Tên",
          "Ngày Ký",
        );

        const dailyByEmployee = new Map<
          string,
          Map<
            number,
            { checkIn: string; checkOut: string; working: number; ot: number }
          >
        >();

        for (const d of dailyData) {
          const dayNum = new Date(d.work_date).getDate();
          if (!dailyByEmployee.has(d.employee_id)) {
            dailyByEmployee.set(d.employee_id, new Map());
          }
          dailyByEmployee.get(d.employee_id)!.set(dayNum, {
            checkIn: formatTimeHHmm(d.check_in_time),
            checkOut: formatTimeHHmm(d.check_out_time),
            working: d.working_units || 0,
            ot: d.overtime_units || 0,
          });
        }

        type EmployeeInfo = {
          employee_id: string;
          full_name: string;
          department: string;
          chuc_vu: string;
        };

        const employeesByDepartment = new Map<
          string,
          { employee: (typeof monthlyData)[0]; emp: EmployeeInfo | undefined }[]
        >();

        for (const m of monthlyData) {
          const emp = employeeMap.get(m.employee_id);
          const dept = emp?.department || "Không xác định";
          if (!employeesByDepartment.has(dept)) {
            employeesByDepartment.set(dept, []);
          }
          employeesByDepartment.get(dept)!.push({
            employee: m,
            emp,
          });
        }

        const dataRows: (string | number)[][] = [];
        const departmentRowIndices: number[] = [];
        let stt = 1;

        const naturalSortDepartments = (a: string, b: string): number => {
          const xtPattern = /^XT(\d+)$/i;
          const matchA = a.match(xtPattern);
          const matchB = b.match(xtPattern);

          if (matchA && matchB) {
            return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
          }

          if (matchA && !matchB) return -1;
          if (!matchA && matchB) return 1;

          return a.localeCompare(b, "vi", { sensitivity: "base" });
        };

        const sortedDepartments = Array.from(employeesByDepartment.entries()).sort(
          ([deptA], [deptB]) => naturalSortDepartments(deptA, deptB),
        );

        for (const [dept, empList] of sortedDepartments) {
          departmentRowIndices.push(dataRows.length + 1);

          const deptRow: (string | number)[] = [`Bộ phận ${dept}`];
          for (let i = 1; i < headerRow.length; i++) {
            deptRow.push("");
          }
          dataRows.push(deptRow);

          for (const { employee: m, emp } of empList) {
            const dailyMap = dailyByEmployee.get(m.employee_id) || new Map();

            const row1: (string | number)[] = [
              stt,
              m.employee_id,
              emp?.full_name || "",
            ];
            const row2: (string | number)[] = ["", "", ""];

            for (let d = 1; d <= daysInMonth; d++) {
              const dayData = dailyMap.get(d);
              row1.push(dayData?.checkIn || "", dayData?.checkOut || "");
              row2.push(dayData?.working ?? "", dayData?.ot ?? "");
            }

            const signatureLog = signatureLogsMap.get(m.employee_id);
            row1.push(
              m.total_days,
              m.total_hours,
              m.total_meal_ot_hours,
              m.total_ot_hours,
              m.sick_days,
              signatureLog?.signed_by_name || "Chưa Ký",
              formatSignedAtDate(signatureLog?.signed_at || null),
            );
            row2.push("", "", "", "", "", "", "");

            dataRows.push(row1, row2);
            stt++;
          }
        }

        const sheetData = [headerRow, ...dataRows];
        const dailySheet = XLSX.utils.aoa_to_sheet(sheetData);

        const colWidths: { wch: number }[] = [
          { wch: 4 },
          { wch: 10 },
          { wch: 20 },
        ];
        for (let d = 1; d <= daysInMonth; d++) {
          colWidths.push({ wch: 6 }, { wch: 6 });
        }
        colWidths.push(
          { wch: 10 },
          { wch: 10 },
          { wch: 10 },
          { wch: 10 },
          { wch: 8 },
          { wch: 20 },
          { wch: 12 },
        );
        dailySheet["!cols"] = colWidths;

        const merges: XLSX.Range[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const startCol = 3 + (d - 1) * 2;
          merges.push({
            s: { r: 0, c: startCol },
            e: { r: 0, c: startCol + 1 },
          });
        }

        const summaryStartCol = 3 + daysInMonth * 2;
        const totalCols = headerRow.length;

        for (const deptRowIdx of departmentRowIndices) {
          merges.push({
            s: { r: deptRowIdx, c: 0 },
            e: { r: deptRowIdx, c: totalCols - 1 },
          });
        }

        let employeeRowIndex = 0;
        for (let r = 1; r < sheetData.length; r++) {
          if (departmentRowIndices.includes(r)) continue;

          if (employeeRowIndex % 2 === 0) {
            const startRow = r;
            merges.push({
              s: { r: startRow, c: 0 },
              e: { r: startRow + 1, c: 0 },
            });
            merges.push({
              s: { r: startRow, c: 1 },
              e: { r: startRow + 1, c: 1 },
            });
            merges.push({
              s: { r: startRow, c: 2 },
              e: { r: startRow + 1, c: 2 },
            });

            for (let col = 0; col < 7; col++) {
              merges.push({
                s: { r: startRow, c: summaryStartCol + col },
                e: { r: startRow + 1, c: summaryStartCol + col },
              });
            }
          }
          employeeRowIndex++;
        }
        dailySheet["!merges"] = merges;

        const totalRows = sheetData.length;
        const cellStyle = {
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
          },
        };

        const deptRowStyle = {
          font: {
            bold: true,
            color: { rgb: "1F4E79" },
          },
          alignment: {
            horizontal: "left",
            vertical: "center",
          },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
          },
        };

        for (let r = 0; r < totalRows; r++) {
          const isDeptRow = departmentRowIndices.includes(r);

          for (let c = 0; c < totalCols; c++) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            if (!dailySheet[cellRef]) {
              dailySheet[cellRef] = { v: "", t: "s" };
            }
            dailySheet[cellRef].s = isDeptRow ? deptRowStyle : cellStyle;
          }
        }

        XLSX.utils.book_append_sheet(workbook, dailySheet, "Chi Tiết Ngày");
      }
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const monthStr = String(period_month).padStart(2, "0");
    const filename = `BangCong_${period_year}-${monthStr}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Attendance export error:", error);
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi xuất file",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
