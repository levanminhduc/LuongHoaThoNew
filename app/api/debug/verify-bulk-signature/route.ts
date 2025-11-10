import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền truy cập" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const results: {
      timestamp: string;
      checks: Record<
        string,
        {
          exists?: boolean;
          accessible?: boolean;
          error?: string | null;
          testResult?: unknown;
          recordCount?: number | null;
          totalRecords?: number;
          monthStats?: Record<
            string,
            { total: number; signed: number; unsigned: number }
          >;
        }
      >;
      errors: string[];
      summary: Record<string, unknown>;
      recommendations?: Array<{
        priority: string;
        issue: string;
        action: string;
      }>;
    } = {
      timestamp: new Date().toISOString(),
      checks: {},
      errors: [],
      summary: {},
    };

    // ===== 1. CHECK DATABASE FUNCTIONS =====
    console.log("📋 Checking database functions...");

    // Test auto_sign_salary function
    try {
      const { data: testSign, error: signError } = await supabase.rpc(
        "auto_sign_salary",
        {
          p_employee_id: "VERIFY_TEST_ID",
          p_salary_month: "2025-01",
          p_ip_address: "127.0.0.1",
          p_device_info: "verification_test",
        },
      );

      results.checks.auto_sign_salary = {
        exists: !signError || !signError.message.includes("not found"),
        error: signError?.message || null,
        testResult: testSign,
      };
    } catch (e) {
      const error = e as Error;
      results.checks.auto_sign_salary = {
        exists: !error.message.includes("not found"),
        error: error.message,
      };
    }

    // Test bulk_sign_salaries function
    try {
      const { data: testBulk, error: bulkError } = await supabase.rpc(
        "bulk_sign_salaries",
        {
          p_employee_ids: ["VERIFY_TEST_ID"],
          p_salary_month: "2025-01",
          p_ip_address: "127.0.0.1",
          p_device_info: "verification_test",
          p_admin_id: "admin_test",
          p_admin_name: "Test Admin",
          p_bulk_batch_id: "VERIFY_BATCH_TEST",
        },
      );

      results.checks.bulk_sign_salaries = {
        exists: !bulkError || !bulkError.message.includes("not found"),
        error: bulkError?.message || null,
        testResult: testBulk,
      };
    } catch (e) {
      const error = e as Error;
      results.checks.bulk_sign_salaries = {
        exists: !error.message.includes("not found"),
        error: error.message,
      };
    }

    // ===== 2. CHECK TABLES =====
    console.log("📋 Checking tables...");

    const tables = [
      "payrolls",
      "signature_logs",
      "bulk_signature_history",
      "employees",
    ];

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .limit(1);

        results.checks[`table_${table}`] = {
          exists: !error,
          accessible: !error,
          error: error?.message || null,
          recordCount: count,
        };
      } catch (e) {
        const error = e as Error;
        results.checks[`table_${table}`] = {
          exists: false,
          accessible: false,
          error: error.message,
        };
      }
    }

    // ===== 3. CHECK PAYROLL DATA =====
    console.log("📋 Checking payroll data...");

    try {
      const { data: payrolls, error: payrollError } = await supabase
        .from("payrolls")
        .select("salary_month, is_signed")
        .limit(1000);

      if (payrollError) {
        results.checks.payroll_data = {
          accessible: false,
          error: payrollError.message,
        };
      } else {
        const monthStats: Record<
          string,
          { total: number; signed: number; unsigned: number }
        > = {};
        payrolls?.forEach((row: { salary_month: string; is_signed: boolean }) => {
          if (!monthStats[row.salary_month]) {
            monthStats[row.salary_month] = { total: 0, signed: 0, unsigned: 0 };
          }
          monthStats[row.salary_month].total++;
          if (row.is_signed) {
            monthStats[row.salary_month].signed++;
          } else {
            monthStats[row.salary_month].unsigned++;
          }
        });

        results.checks.payroll_data = {
          accessible: true,
          totalRecords: payrolls?.length || 0,
          monthStats,
        };
      }
    } catch (e) {
      const error = e as Error;
      results.checks.payroll_data = {
        accessible: false,
        error: error.message,
      };
    }

    // ===== 4. GENERATE SUMMARY =====
    const functionExists =
      results.checks.auto_sign_salary?.exists &&
      results.checks.bulk_sign_salaries?.exists;

    const tablesAccessible = tables.every(
      (table) => results.checks[`table_${table}`]?.accessible,
    );

    results.summary = {
      functions_ready: functionExists,
      tables_ready: tablesAccessible,
      payroll_data_accessible: results.checks.payroll_data?.accessible || false,
      system_ready:
        functionExists &&
        tablesAccessible &&
        results.checks.payroll_data?.accessible,
    };

    // ===== 5. RECOMMENDATIONS =====
    results.recommendations = [];

    if (!results.checks.bulk_sign_salaries?.exists) {
      results.recommendations.push({
        priority: "CRITICAL",
        issue: "bulk_sign_salaries function not found",
        action:
          "Run: scripts/supabase-setup/25-create-bulk-sign-salaries-function.sql",
      });
    }

    if (!results.checks.auto_sign_salary?.exists) {
      results.recommendations.push({
        priority: "CRITICAL",
        issue: "auto_sign_salary function not found",
        action:
          "Run: scripts/supabase-setup/18-emergency-fix-signature-function-clean.sql",
      });
    }

    if (!tablesAccessible) {
      results.recommendations.push({
        priority: "HIGH",
        issue: "Some tables not accessible",
        action: "Check RLS policies in Supabase Dashboard",
      });
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
