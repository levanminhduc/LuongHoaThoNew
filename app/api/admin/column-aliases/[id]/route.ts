import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import { type ColumnAlias, type ApiResponse } from "@/lib/column-alias-config";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  ColumnAliasUpdateRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  deleteColumnAlias,
  findAliasByFieldAndNameExcluding,
  findAliasDatabaseField,
  findAliasName,
  findColumnAliasById,
  updateColumnAlias,
} from "@/lib/import/column-alias-repository";

// GET: Fetch specific column alias
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = verifyAdminAccess(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status },
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
    const { data: alias, error } = await findColumnAliasById(supabase, aliasId);

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
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi tải alias",
    });
  }
}

// PUT: Update column alias
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const authResult = verifyAdminAccess(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status },
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

    const parsed = parseSchema(
      ColumnAliasUpdateRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { alias_name, confidence_score, is_active } = parsed.data;

    const supabase = createServiceClient();

    const { data: existing } = await findAliasDatabaseField(supabase, aliasId);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy alias để cập nhật" },
        { status: 404 },
      );
    }

    const { data: duplicate } = await findAliasByFieldAndNameExcluding(
      supabase,
      existing.database_field,
      alias_name.trim(),
      aliasId,
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên alias này đã tồn tại cho trường database",
        },
        { status: 409 },
      );
    }

    const updateData: Partial<ColumnAlias> = {
      alias_name: alias_name.trim(),
      updated_at: getVietnamTimestamp(),
    };

    if (confidence_score !== undefined) {
      updateData.confidence_score = confidence_score;
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    const { data: updatedAlias, error } = await updateColumnAlias(
      supabase,
      aliasId,
      updateData,
    );

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
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi cập nhật alias",
    });
  }
}

// DELETE: Delete column alias
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const authResult = verifyAdminAccess(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status },
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

    const { data: existing } = await findAliasName(supabase, aliasId);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy alias để xóa" },
        { status: 404 },
      );
    }

    const { error } = await deleteColumnAlias(supabase, aliasId);

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
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi xóa alias",
    });
  }
}
