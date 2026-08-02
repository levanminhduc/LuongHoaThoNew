import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  pageQuerySchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import { findEmployeeNamesByIds } from "@/lib/employee/employee-auth-repository";
import { buildPasswordResetHistoryQuery } from "@/lib/audit/audit-log-repository";

const PasswordResetHistoryQuerySchema = pageQuerySchema(50);

interface SecurityLog {
  id: number;
  employee_id: string | null;
  action: string;
  ip_address: string | null;
  details: string | null;
  created_at: string;
  employee?: {
    full_name: string;
    department: string;
  };
}

interface PasswordResetHistoryResponse {
  success: boolean;
  logs: SecurityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = parseSchema(PasswordResetHistoryQuerySchema, {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedQuery.errors),
        { status: 400 },
      );
    }
    const { page, limit } = parsedQuery.data;
    const employeeCode = searchParams.get("employee_code");
    const status = searchParams.get("status");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const ipAddress = searchParams.get("ip_address");

    const supabase = createServiceClient();

    const query = buildPasswordResetHistoryQuery(supabase, {
      employeeCode,
      status,
      startDate,
      endDate,
      ipAddress,
      page,
      limit,
    });

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error("Error fetching security logs:", logsError);
      return NextResponse.json(
        { error: "Lỗi khi tải dữ liệu lịch sử" },
        { status: 500 },
      );
    }

    const employeeIds = logs
      ?.map((log) => log.employee_id)
      .filter((id): id is string => id !== null);

    let employeeMap: Record<string, { full_name: string; department: string }> =
      {};

    if (employeeIds && employeeIds.length > 0) {
      const { data: employees } = await findEmployeeNamesByIds(
        supabase,
        employeeIds,
      );

      if (employees) {
        employeeMap = employees.reduce(
          (acc, emp) => {
            acc[emp.employee_id] = {
              full_name: emp.full_name,
              department: emp.department || "N/A",
            };
            return acc;
          },
          {} as Record<string, { full_name: string; department: string }>,
        );
      }
    }

    const enrichedLogs = logs?.map((log) => ({
      ...log,
      employee: log.employee_id ? employeeMap[log.employee_id] : undefined,
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    const response: PasswordResetHistoryResponse = {
      success: true,
      logs: enrichedLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Password reset history error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi tải lịch sử",
    });
  }
}
