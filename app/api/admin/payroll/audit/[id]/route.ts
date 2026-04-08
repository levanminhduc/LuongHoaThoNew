import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import jwt from "jsonwebtoken";
import { type JWTPayload } from "@/lib/auth";
import { getJwtSecret } from "@/lib/config/jwt";

interface AuditLog {
  id: number;
  changed_at: string;
  change_reason: string;
  changed_by: string;
  change_ip?: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
}

interface AuditGroup {
  id: number;
  changed_at: string;
  change_reason: string;
  changed_by: string;
  change_ip?: string | null;
  changes: Array<{
    field_name: string;
    old_value: string | null;
    new_value: string | null;
  }>;
}

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

// GET audit trail for specific payroll record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const resolvedParams = await params;
    const payrollId = parseInt(resolvedParams.id);
    if (isNaN(payrollId)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    const supabase = createServiceClient();
    console.log("🔍 Fetching audit trail for payroll ID:", payrollId);

    // First, check if audit table exists and is accessible
    try {
      const { error: tableError } = await supabase
        .from("payroll_audit_logs")
        .select("id")
        .limit(1);

      if (tableError) {
        console.error("❌ Audit table access error:", tableError);

        // Check if it's a table not found error
        if (
          tableError.message?.includes("relation") ||
          tableError.message?.includes("does not exist")
        ) {
          return NextResponse.json(
            {
              error:
                "Bảng audit trail chưa được tạo. Vui lòng liên hệ admin để setup.",
            },
            { status: 500 },
          );
        }

        // Check if it's an RLS error
        if (
          tableError.code === "42501" ||
          tableError.message?.includes("RLS")
        ) {
          return NextResponse.json(
            {
              error:
                "Lỗi quyền truy cập audit trail. Vui lòng kiểm tra RLS policies.",
            },
            { status: 500 },
          );
        }

        return NextResponse.json(
          {
            error: "Lỗi khi truy cập bảng audit trail.",
          },
          { status: 500 },
        );
      }

      console.log("✅ Audit table accessible");
    } catch (accessError) {
      console.error("❌ Audit table access exception:", accessError);
      return NextResponse.json(
        {
          error: "Không thể truy cập bảng audit trail.",
        },
        { status: 500 },
      );
    }

    // Get audit trail for this payroll record
    const { data: auditData, error: auditError } = await supabase
      .from("payroll_audit_logs")
      .select("*")
      .eq("payroll_id", payrollId)
      .order("changed_at", { ascending: false });

    console.log("📊 Audit query result:", {
      hasData: !!auditData,
      dataLength: auditData?.length || 0,
      hasError: !!auditError,
      error: auditError,
    });

    if (auditError) {
      console.error("❌ Error fetching audit trail:", auditError);
      return NextResponse.json(
        {
          error: "Lỗi khi lấy lịch sử thay đổi",
        },
        { status: 500 },
      );
    }

    // Group changes by timestamp and reason
    const groupedChanges =
      auditData?.reduce((groups: AuditGroup[], log: AuditLog) => {
        const existingGroup = groups.find(
          (group) =>
            group.changed_at === log.changed_at &&
            group.change_reason === log.change_reason &&
            group.changed_by === log.changed_by,
        );

        if (existingGroup) {
          existingGroup.changes.push({
            field_name: log.field_name,
            old_value: log.old_value,
            new_value: log.new_value,
          });
        } else {
          groups.push({
            id: log.id,
            changed_by: log.changed_by,
            changed_at: log.changed_at,
            change_ip: log.change_ip,
            change_reason: log.change_reason,
            changes: [
              {
                field_name: log.field_name,
                old_value: log.old_value,
                new_value: log.new_value,
              },
            ],
          });
        }

        return groups;
      }, []) || [];

    // If no audit data exists, create a helpful message
    if (!auditData || auditData.length === 0) {
      console.log("ℹ️ No audit data found for payroll ID:", payrollId);

      // Check if the payroll record exists
      const { data: payrollExists } = await supabase
        .from("payrolls")
        .select("id, employee_id, salary_month")
        .eq("id", payrollId)
        .single();

      if (!payrollExists) {
        return NextResponse.json(
          {
            error: "Không tìm thấy bản ghi lương với ID này.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        auditTrail: [],
        totalChanges: 0,
        message: "Chưa có thay đổi nào được ghi nhận cho bản ghi lương này.",
        payrollInfo: payrollExists,
      });
    }

    return NextResponse.json({
      success: true,
      auditTrail: groupedChanges,
      totalChanges: auditData?.length || 0,
      message: `Tìm thấy ${auditData.length} thay đổi được ghi nhận.`,
    });
  } catch (error) {
    console.error("Get audit trail error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy lịch sử thay đổi" },
      { status: 500 },
    );
  }
}

// GET audit summary for dashboard
export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { startDate, endDate, employeeId } = await request.json();

    const supabase = createServiceClient();

    let query = supabase
      .from("payroll_audit_logs")
      .select(
        `
        id,
        employee_id,
        salary_month,
        changed_by,
        changed_at,
        change_reason,
        field_name
      `,
      )
      .order("changed_at", { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte("changed_at", startDate);
    }
    if (endDate) {
      query = query.lte("changed_at", endDate);
    }
    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data: auditData, error: auditError } = await query.limit(100);

    if (auditError) {
      console.error("Error fetching audit summary:", auditError);
      return NextResponse.json(
        { error: "Lỗi khi lấy tổng quan thay đổi" },
        { status: 500 },
      );
    }

    // Calculate statistics
    const stats = {
      totalChanges: auditData?.length || 0,
      uniqueEmployees: new Set(auditData?.map((log) => log.employee_id)).size,
      uniqueAdmins: new Set(auditData?.map((log) => log.changed_by)).size,
      recentChanges: auditData?.slice(0, 10) || [],
    };

    return NextResponse.json({
      success: true,
      stats,
      auditData: auditData || [],
    });
  } catch (error) {
    console.error("Get audit summary error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy tổng quan thay đổi" },
      { status: 500 },
    );
  }
}
