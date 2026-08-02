import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import {
  type ColumnAlias,
  type AliasSearchParams,
  type ApiResponse,
} from "@/lib/column-alias-config";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  ColumnAliasCreateRequestSchema,
  ColumnAliasBulkRequestSchema,
  ColumnAliasListQuerySchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  buildColumnAliasListQuery,
  findAliasByDuplicateKey,
  findAliasByFieldAndName,
  insertColumnAlias,
  insertColumnAliasWithoutReturn,
} from "@/lib/import/column-alias-repository";

// GET: Fetch column aliases with search/filter
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminAccess(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = parseSchema(
      ColumnAliasListQuerySchema,
      Object.fromEntries(searchParams),
    );
    if (!parsedQuery.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedQuery.errors),
        { status: 400 },
      );
    }
    const params: AliasSearchParams = {
      ...parsedQuery.data,
      database_field: parsedQuery.data.database_field ?? undefined,
      alias_name: parsedQuery.data.alias_name ?? undefined,
      created_by: parsedQuery.data.created_by ?? undefined,
      confidence_min: parsedQuery.data.confidence_min ?? undefined,
      confidence_max: parsedQuery.data.confidence_max ?? undefined,
    };

    const supabase = createServiceClient();
    const {
      data: aliases,
      error,
      count,
    } = await buildColumnAliasListQuery(supabase, params);

    if (error) {
      console.error("Error fetching column aliases:", error);
      return NextResponse.json(
        { success: false, message: "Lỗi khi tải danh sách aliases" },
        { status: 500 },
      );
    }

    const response: ApiResponse<ColumnAlias[]> = {
      success: true,
      data: aliases || [],
      meta: {
        total: count || 0,
        page: params.page || 1,
        limit: params.limit || 50,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Column aliases GET error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi tải aliases",
    });
  }
}

// POST: Create new column alias
export async function POST(request: NextRequest) {
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
    const adminUser = authResult.user;

    const parsed = parseSchema(
      ColumnAliasCreateRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { database_field, alias_name, confidence_score, config_id } =
      parsed.data;

    const supabase = createServiceClient();

    const { data: existing } = await findAliasByDuplicateKey(supabase, {
      database_field,
      alias_name,
      config_id,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `Alias này đã tồn tại cho trường database${config_id ? " trong configuration này" : " (global)"}`,
        },
        { status: 409 },
      );
    }

    const aliasData: Partial<ColumnAlias> = {
      database_field,
      alias_name: alias_name.trim(),
      confidence_score,
      is_active: true,
      created_by: adminUser.username,
    };

    // Add config_id if provided
    if (config_id) {
      aliasData.config_id = config_id;
    }

    const { data: newAlias, error } = await insertColumnAlias(
      supabase,
      aliasData,
    );

    if (error) {
      console.error("Error creating column alias:", error);
      return NextResponse.json(
        { success: false, message: "Lỗi khi tạo alias mới" },
        { status: 500 },
      );
    }

    const response: ApiResponse<ColumnAlias> = {
      success: true,
      data: newAlias,
      message: "Tạo alias thành công",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Column aliases POST error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi tạo alias",
    });
  }
}

// PUT: Bulk create aliases
export async function PUT(request: NextRequest) {
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
    const adminUser = authResult.user;

    const parsed = parseSchema(
      ColumnAliasBulkRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { aliases } = parsed.data;

    const supabase = createServiceClient();
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each alias
    for (const alias of aliases) {
      try {
        const { database_field, alias_name, confidence_score = 80 } = alias;

        if (!database_field || !alias_name) {
          results.errors.push(`Thiếu thông tin: ${JSON.stringify(alias)}`);
          continue;
        }

        const { data: existing } = await findAliasByFieldAndName(
          supabase,
          database_field,
          alias_name,
        );

        if (existing) {
          results.skipped++;
          continue;
        }

        const { error } = await insertColumnAliasWithoutReturn(supabase, {
          database_field,
          alias_name: alias_name.trim(),
          confidence_score,
          is_active: true,
          created_by: adminUser.username,
        });

        if (error) {
          results.errors.push(
            `Lỗi tạo alias "${alias_name}": ${error.message}`,
          );
        } else {
          results.created++;
        }
      } catch {
        results.errors.push(`Lỗi xử lý alias: ${JSON.stringify(alias)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Hoàn thành: ${results.created} tạo mới, ${results.skipped} bỏ qua`,
      data: results,
    });
  } catch (error) {
    console.error("Column aliases bulk create error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi tạo bulk aliases",
    });
  }
}
