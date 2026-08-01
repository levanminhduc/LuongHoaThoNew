import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { authorizeRoles } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  ImportSessionHistoryCreateSchema,
  ImportHistoryDeleteQuerySchema,
  pageQuerySchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";

const IMPORT_MANAGEMENT_ROLES = ["admin", "van_phong", "nguoi_lap_bieu"];

const ImportHistoryListQuerySchema = pageQuerySchema(20);

// POST - Create new import history record
export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = authorizeRoles(request, IMPORT_MANAGEMENT_ROLES);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập chức năng này" },
        { status: 403 },
      );
    }

    const parsed = parseSchema(
      ImportSessionHistoryCreateSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }

    // For now, we'll store in a mock way since we don't have import_history table
    // In a real implementation, you would create this table in Supabase
    const mockData = {
      id: `hist_${Date.now()}`,
      ...parsed.data,
      user_id: auth.user.employee_id || "admin",
      created_at: getVietnamTimestamp(),
    };

    // TODO: Create import_history table in Supabase and uncomment below
    // const { data, error } = await supabase
    //   .from("import_history")
    //   .insert(mockData)
    //   .select()
    //   .single()

    // For now, return mock success
    const data = mockData;
    const error = null;

    if (error) {
      console.error("Error creating import history:", error);
      return NextResponse.json(
        { error: "Failed to create import history record" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Import history creation error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Internal server error",
    });
  }
}

// GET - Retrieve import history with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    if (!authorizeRoles(request, IMPORT_MANAGEMENT_ROLES)) {
      return NextResponse.json(
        { error: "Không có quyền truy cập chức năng này" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = parseSchema(ImportHistoryListQuerySchema, {
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
    const status = searchParams.get("status");
    const importType = searchParams.get("import_type");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    const supabase = createServiceClient();

    let query = supabase
      .from("import_history")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (importType) {
      query = query.eq("import_type", importType);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching import history:", error);
      return NextResponse.json(
        { error: "Failed to fetch import history" },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    const summaryQuery = supabase
      .from("import_history")
      .select(
        "total_records, success_count, error_count, auto_fix_count, processing_time_ms, status",
      );

    const { data: summaryData, error: summaryError } = await summaryQuery;

    const summary = {
      total_imports: 0,
      total_records_processed: 0,
      total_success: 0,
      total_errors: 0,
      total_auto_fixes: 0,
      average_processing_time: 0,
      success_rate: 0,
      status_breakdown: {
        completed: 0,
        failed: 0,
        partial: 0,
      },
    };

    if (!summaryError && summaryData) {
      summary.total_imports = summaryData.length;
      summary.total_records_processed = summaryData.reduce(
        (sum, record) => sum + (record.total_records || 0),
        0,
      );
      summary.total_success = summaryData.reduce(
        (sum, record) => sum + (record.success_count || 0),
        0,
      );
      summary.total_errors = summaryData.reduce(
        (sum, record) => sum + (record.error_count || 0),
        0,
      );
      summary.total_auto_fixes = summaryData.reduce(
        (sum, record) => sum + (record.auto_fix_count || 0),
        0,
      );
      summary.average_processing_time =
        summaryData.reduce(
          (sum, record) => sum + (record.processing_time_ms || 0),
          0,
        ) / summaryData.length;
      summary.success_rate =
        summary.total_records_processed > 0
          ? (summary.total_success / summary.total_records_processed) * 100
          : 0;

      summaryData.forEach((record) => {
        if (record.status in summary.status_breakdown) {
          summary.status_breakdown[
            record.status as keyof typeof summary.status_breakdown
          ]++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
      summary,
    });
  } catch (error) {
    console.error("Import history fetch error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Internal server error",
    });
  }
}

// DELETE - Delete import history record
export async function DELETE(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    if (!authorizeRoles(request, IMPORT_MANAGEMENT_ROLES)) {
      return NextResponse.json(
        { error: "Không có quyền truy cập chức năng này" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseSchema(ImportHistoryDeleteQuerySchema, {
      id: searchParams.get("id"),
    });
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { id } = parsed.data;

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("import_history")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting import history:", error);
      return NextResponse.json(
        { error: "Failed to delete import history record" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Import history deletion error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Internal server error",
    });
  }
}
