import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const employeeCode = searchParams.get("employee_code");
    const status = searchParams.get("status");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const ipAddress = searchParams.get("ip_address");

    const supabase = createServiceClient();

    let query = supabase
      .from("security_logs")
      .select(
        `
        id,
        employee_id,
        action,
        ip_address,
        details,
        created_at
      `,
        { count: "exact" },
      )
      .in("action", [
        "forgot_password_success",
        "forgot_password_failed",
        "forgot_password_blocked",
      ])
      .order("created_at", { ascending: false });

    if (employeeCode) {
      query = query.eq("employee_id", employeeCode.trim());
    }

    if (status && status !== "all") {
      query = query.eq("action", status);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endDateTime.toISOString());
    }

    if (ipAddress) {
      query = query.ilike("ip_address", `${ipAddress.trim()}%`);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

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
      const { data: employees } = await supabase
        .from("employees")
        .select("employee_id, full_name, department")
        .in("employee_id", employeeIds);

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
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải lịch sử" },
      { status: 500 },
    );
  }
}
