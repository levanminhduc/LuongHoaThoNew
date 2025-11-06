import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    if (!["giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(auth.user.role)) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const month = searchParams.get("month");
    const department = searchParams.get("department");
    const search = searchParams.get("search");

    if (!month) {
      return NextResponse.json(
        { error: "Thiếu tham số month" },
        { status: 400 },
      );
    }

    const { data: payrollsData } = await supabase
      .from("payrolls")
      .select("employee_id, is_signed, tien_luong_thuc_nhan_cuoi_ky")
      .eq("salary_month", month)
      .eq("is_signed", false);

    if (!payrollsData || payrollsData.length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu để xuất" },
        { status: 404 },
      );
    }

    const unsignedEmployeeIds = payrollsData.map((p) => p.employee_id);

    let employeeQuery = supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu")
      .in("employee_id", unsignedEmployeeIds)
      .eq("is_active", true)
      .order("department")
      .order("chuc_vu", { ascending: false })
      .order("full_name");

    if (search && search.length >= 2) {
      employeeQuery = employeeQuery.or(
        `employee_id.ilike.%${search}%,full_name.ilike.%${search}%`,
      );
    }

    if (department && department !== "all") {
      employeeQuery = employeeQuery.eq("department", department);
    }

    const { data: employees, error: employeeError } = await employeeQuery;

    if (employeeError) {
      console.error("Error fetching employees:", employeeError);
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu nhân viên" },
        { status: 500 },
      );
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu để xuất" },
        { status: 404 },
      );
    }

    const employeesWithSalary = employees.map((emp) => {
      const payroll = payrollsData.find((p) => p.employee_id === emp.employee_id);
      return {
        ...emp,
        tien_luong_thuc_nhan_cuoi_ky: payroll?.tien_luong_thuc_nhan_cuoi_ky || 0,
      };
    });

    const workbook = XLSX.utils.book_new();

    const headers = [
      "STT",
      "Mã Nhân Viên",
      "Họ Tên",
      "Phòng Ban",
      "Chức Vụ",
      "Lương Thực Nhận",
    ];

    const formatSalary = (amount: number): string => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount);
    };

    const dataRows = employeesWithSalary.map((emp, index) => [
      index + 1,
      emp.employee_id,
      emp.full_name,
      emp.department,
      emp.chuc_vu,
      formatSalary(emp.tien_luong_thuc_nhan_cuoi_ky),
    ]);

    const worksheetData = [headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const columnWidths = [
      { wch: 5 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Nhân Viên Chưa Ký");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `NV_Chua_Ky_${month}_${timestamp}.xlsx`;

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
    console.error("Unsigned employees export error:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi xuất Excel",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

