import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import { toErrorResponse } from "@/lib/errors/app-error";
import { findPayrollPreviewByBatch } from "@/lib/payroll/payroll-repository";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id");

    if (!batchId) {
      return NextResponse.json({ error: "Thiếu batch_id" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: previewData, error } = await findPayrollPreviewByBatch(
      supabase,
      batchId,
    );

    if (error) {
      console.error("Error fetching preview data:", error);
      return NextResponse.json(
        { error: "Lỗi khi lấy dữ liệu preview" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: previewData || [],
      total: previewData?.length || 0,
    });
  } catch (error) {
    console.error("Preview API error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Lỗi server",
    });
  }
}
