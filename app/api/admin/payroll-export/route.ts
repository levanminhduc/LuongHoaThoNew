import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import XLSX from "xlsx-js-style";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { getVietnamDate } from "@/lib/utils/vietnam-timezone";
import { toErrorResponse } from "@/lib/errors/app-error";
import { findSignatureLogsWithMonth } from "@/lib/signature/signature-log-repository";
import { findSignatureSummaryForMonth } from "@/lib/signature/management-signature-repository";
import {
  buildPayrollExportFallbackQuery,
  buildPayrollExportQuery,
  findAvailableSalaryMonths,
  type PayrollExportScope,
} from "@/lib/payroll/payroll-export-repository";
import {
  buildPayrollExportSheet,
  type PayrollExportRecord,
  type PayrollManagementSignature,
  type PayrollSignatureLog,
} from "@/lib/excel/payroll-export-sheet";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
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
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const month = searchParams.get("month");
    const department = searchParams.get("department");
    const payrollType = searchParams.get("payroll_type") || "monthly";
    const isT13 = payrollType === "t13";

    const scope: PayrollExportScope = {
      allowedDepartments: null,
      department: null,
    };

    if (
      ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
        auth.user.role,
      )
    ) {
      const allowedDepartments = auth.user.allowed_departments || [];
      if (allowedDepartments.length === 0) {
        return NextResponse.json(
          {
            error: "Chưa được phân quyền truy cập department nào",
          },
          { status: 403, headers: CACHE_HEADERS.sensitive },
        );
      }

      if (department && !allowedDepartments.includes(department)) {
        return NextResponse.json(
          {
            error: "Không có quyền truy cập department này",
          },
          { status: 403, headers: CACHE_HEADERS.sensitive },
        );
      }

      scope.allowedDepartments = allowedDepartments;
      scope.department = department;
    } else if (auth.user.role === "to_truong") {
      scope.department = auth.user.department;
    } else if (auth.user.role === "admin") {
      scope.department = department;
    }

    const queryResult = await buildPayrollExportQuery(
      supabase,
      month,
      isT13,
      scope,
    );
    let payrollData = queryResult.data;
    const error = queryResult.error;

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
        },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    if (!payrollData || payrollData.length === 0) {
      const { data: fallbackData, error: fallbackError } =
        await buildPayrollExportFallbackQuery(supabase, month);

      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        const { data: availableMonths } =
          await findAvailableSalaryMonths(supabase);

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
          },
          { status: 404, headers: CACHE_HEADERS.sensitive },
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
          { status: 404, headers: CACHE_HEADERS.sensitive },
        );
      }

      // Use filtered data for export
      payrollData = filteredData;
    }

    // Create workbook
    const signatureLogsMap = new Map<string, PayrollSignatureLog>();
    if (month) {
      try {
        const { data: signatureLogs, error: sigLogsError } =
          await findSignatureLogsWithMonth(supabase, month);

        if (!sigLogsError && signatureLogs) {
          signatureLogs.forEach((log) => {
            signatureLogsMap.set(log.employee_id, log as PayrollSignatureLog);
          });
        }
      } catch (_e) {
        console.error("Failed to load signature logs:", _e);
      }
    }

    // Fetch management signatures for the month
    const managementSignatures: {
      giam_doc: PayrollManagementSignature | null;
      ke_toan: PayrollManagementSignature | null;
      nguoi_lap_bieu: PayrollManagementSignature | null;
    } = {
      giam_doc: null,
      ke_toan: null,
      nguoi_lap_bieu: null,
    };

    if (month) {
      try {
        const { data: signatures, error: sigError } =
          await findSignatureSummaryForMonth(supabase, month);

        if (!sigError && signatures) {
          signatures.forEach((sig) => {
            managementSignatures[
              sig.signature_type as keyof typeof managementSignatures
            ] = sig;
          });
        }
      } catch (_e) {
        console.error("Failed to load management signatures:", _e);
      }
    }

    const workbook = XLSX.utils.book_new();
    const { worksheet, sheetName } = buildPayrollExportSheet({
      payrollData: (payrollData ?? []) as unknown as PayrollExportRecord[],
      signatureLogsMap,
      managementSignatures,
      month,
      department,
      isT13,
    });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create meaningful filename (safe for download)
    const timestamp = getVietnamDate();
    const departmentName = department || "TatCa";
    const monthName = month || "TatCa";

    const safeDepartmentName = departmentName
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 20);

    const typePrefix = isT13 ? "Luong13" : "Luong";
    const filename = `${typePrefix}_${safeDepartmentName}_${monthName}_${timestamp}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
        ...CACHE_HEADERS.sensitive,
      },
    });
  } catch (error) {
    console.error("Payroll export error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi xuất dữ liệu lương",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
