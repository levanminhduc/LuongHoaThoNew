import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import jwt from "jsonwebtoken";
import { type ColumnAlias, type ApiResponse } from "@/lib/column-alias-config";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

// GET: Fetch specific column alias
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const resolvedParams = await params;
    const aliasId = parseInt(resolvedParams.id);
    if (isNaN(aliasId)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: alias, error } = await supabase
      .from("column_aliases")
      .select("*")
      .eq("id", aliasId)
      .single();

    if (error || !alias) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy alias" },
        { status: 404 },
      );
    }

    const response: ApiResponse<ColumnAlias> = {
      success: true,
      data: alias,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Column alias GET error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tải alias" },
      { status: 500 },
    );
  }
}

// PUT: Update column alias
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const resolvedParams = await params;
    const aliasId = parseInt(resolvedParams.id);
    if (isNaN(aliasId)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { alias_name, confidence_score, is_active } = body;

    if (!alias_name) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin alias_name" },
        { status: 400 },
      );
    }

    // Validate confidence score
    if (
      confidence_score !== undefined &&
      (confidence_score < 0 || confidence_score > 100)
    ) {
      return NextResponse.json(
        { success: false, message: "Confidence score phải từ 0 đến 100" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Check if alias exists
    const { data: existing } = await supabase
      .from("column_aliases")
      .select("database_field")
      .eq("id", aliasId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy alias để cập nhật" },
        { status: 404 },
      );
    }

    // Check for duplicate alias name (excluding current record)
    const { data: duplicate } = await supabase
      .from("column_aliases")
      .select("id")
      .eq("database_field", existing.database_field)
      .eq("alias_name", alias_name.trim())
      .neq("id", aliasId)
      .single();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên alias này đã tồn tại cho trường database",
        },
        { status: 409 },
      );
    }

    // Update alias
    const updateData: Partial<ColumnAlias> = {
      alias_name: alias_name.trim(),
      updated_at: new Date().toISOString(),
    };

    if (confidence_score !== undefined) {
      updateData.confidence_score = confidence_score;
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    const { data: updatedAlias, error } = await supabase
      .from("column_aliases")
      .update(updateData)
      .eq("id", aliasId)
      .select()
      .single();

    if (error) {
      console.error("Error updating column alias:", error);
      return NextResponse.json(
        { success: false, message: "Lỗi khi cập nhật alias" },
        { status: 500 },
      );
    }

    const response: ApiResponse<ColumnAlias> = {
      success: true,
      data: updatedAlias,
      message: "Cập nhật alias thành công",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Column alias PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi cập nhật alias" },
      { status: 500 },
    );
  }
}

// DELETE: Delete column alias
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const resolvedParams = await params;
    const aliasId = parseInt(resolvedParams.id);
    if (isNaN(aliasId)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Check if alias exists
    const { data: existing } = await supabase
      .from("column_aliases")
      .select("id, alias_name")
      .eq("id", aliasId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy alias để xóa" },
        { status: 404 },
      );
    }

    // Delete alias
    const { error } = await supabase
      .from("column_aliases")
      .delete()
      .eq("id", aliasId);

    if (error) {
      console.error("Error deleting column alias:", error);
      return NextResponse.json(
        { success: false, message: "Lỗi khi xóa alias" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa alias "${existing.alias_name}" thành công`,
    });
  } catch (error) {
    console.error("Column alias DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi xóa alias" },
      { status: 500 },
    );
  }
}
