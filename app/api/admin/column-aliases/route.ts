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
    let query = supabase.from("column_aliases").select("*", { count: "exact" });

    // Apply filters
    if (params.database_field) {
      query = query.eq("database_field", params.database_field);
    }
    if (params.alias_name) {
      query = query.ilike("alias_name", `%${params.alias_name}%`);
    }
    if (params.is_active !== undefined) {
      query = query.eq("is_active", params.is_active);
    }
    if (params.created_by) {
      query = query.eq("created_by", params.created_by);
    }
    if (params.confidence_min !== undefined) {
      query = query.gte("confidence_score", params.confidence_min);
    }
    if (params.confidence_max !== undefined) {
      query = query.lte("confidence_score", params.confidence_max);
    }

    // Apply sorting
    query = query.order(params.sort_by!, {
      ascending: params.sort_order === "asc",
    });

    // Apply pagination
    const from = ((params.page || 1) - 1) * (params.limit || 50);
    const to = from + (params.limit || 50) - 1;
    query = query.range(from, to);

    const { data: aliases, error, count } = await query;

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

    // Check for duplicate alias (considering config_id)
    let duplicateQuery = supabase
      .from("column_aliases")
      .select("id")
      .eq("database_field", database_field)
      .eq("alias_name", alias_name);

    if (config_id) {
      duplicateQuery = duplicateQuery.eq("config_id", config_id);
    } else {
      duplicateQuery = duplicateQuery.is("config_id", null);
    }

    const { data: existing } = await duplicateQuery.single();

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

    const { data: newAlias, error } = await supabase
      .from("column_aliases")
      .insert(aliasData)
      .select()
      .single();

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

        // Check for duplicate
        const { data: existing } = await supabase
          .from("column_aliases")
          .select("id")
          .eq("database_field", database_field)
          .eq("alias_name", alias_name)
          .single();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create alias
        const { error } = await supabase.from("column_aliases").insert({
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
