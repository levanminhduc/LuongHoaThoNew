import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import {
  type MappingConfiguration,
  type ConfigurationSearchParams,
  type ApiResponse,
} from "@/lib/column-alias-config";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  parseSchema,
  createValidationErrorResponse,
  MappingConfigurationCreateRequestSchema,
  MappingConfigurationSaveRequestSchema,
  MappingConfigurationListQuerySchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";

// GET: Fetch mapping configurations
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
      MappingConfigurationListQuerySchema,
      Object.fromEntries(searchParams),
    );
    if (!parsedQuery.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedQuery.errors),
        { status: 400 },
      );
    }
    const params: ConfigurationSearchParams = {
      ...parsedQuery.data,
      config_name: parsedQuery.data.config_name ?? undefined,
      created_by: parsedQuery.data.created_by ?? undefined,
    };

    const supabase = createServiceClient();
    let query = supabase.from("mapping_configurations").select(
      `
        *,
        configuration_field_mappings (
          id,
          database_field,
          excel_column_name,
          confidence_score,
          mapping_type,
          validation_passed
        )
      `,
      { count: "exact" },
    );

    // Apply filters
    if (params.config_name) {
      query = query.ilike("config_name", `%${params.config_name}%`);
    }
    if (params.is_active !== undefined) {
      query = query.eq("is_active", params.is_active);
    }
    if (params.is_default !== undefined) {
      query = query.eq("is_default", params.is_default);
    }
    if (params.created_by) {
      query = query.eq("created_by", params.created_by);
    }

    // Apply sorting and pagination
    query = query.order("created_at", { ascending: false });

    const from = ((params.page || 1) - 1) * (params.limit || 20);
    const to = from + (params.limit || 20) - 1;
    query = query.range(from, to);

    const { data: configurations, error, count } = await query;

    if (error) {
      console.error("Error fetching mapping configurations:", error);
      return NextResponse.json(
        { success: false, message: "Lỗi khi tải danh sách cấu hình" },
        { status: 500 },
      );
    }

    const response: ApiResponse<MappingConfiguration[]> = {
      success: true,
      data: configurations || [],
      meta: {
        total: count || 0,
        page: params.page || 1,
        limit: params.limit || 20,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Mapping configurations GET error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi tải cấu hình",
    });
  }
}

// POST: Create new mapping configuration
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
      MappingConfigurationCreateRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { config_name, description, field_mappings, is_default } =
      parsed.data;

    const supabase = createServiceClient();

    // Check for duplicate config name
    const { data: existing } = await supabase
      .from("mapping_configurations")
      .select("id")
      .eq("config_name", config_name)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Tên cấu hình đã tồn tại" },
        { status: 409 },
      );
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from("mapping_configurations")
        .update({ is_default: false })
        .eq("is_default", true);
    }

    // Create configuration
    const { data: newConfig, error: configError } = await supabase
      .from("mapping_configurations")
      .insert({
        config_name: config_name.trim(),
        description: description?.trim(),
        is_default,
        is_active: true,
        created_by: adminUser.username,
      })
      .select()
      .single();

    if (configError) {
      console.error("Error creating mapping configuration:", configError);
      return NextResponse.json(
        { success: false, message: "Lỗi khi tạo cấu hình" },
        { status: 500 },
      );
    }

    // Create field mappings if provided
    if (field_mappings.length > 0) {
      const mappingsToInsert = field_mappings.map((mapping) => ({
        config_id: newConfig.id,
        database_field: mapping.database_field,
        excel_column_name: mapping.excel_column_name,
        confidence_score: mapping.confidence_score || 80,
        mapping_type: mapping.mapping_type || "manual",
        validation_passed: mapping.validation_passed !== false,
      }));

      const { error: mappingsError } = await supabase
        .from("configuration_field_mappings")
        .insert(mappingsToInsert);

      if (mappingsError) {
        console.error("Error creating field mappings:", mappingsError);
        // Rollback configuration creation
        await supabase
          .from("mapping_configurations")
          .delete()
          .eq("id", newConfig.id);

        return NextResponse.json(
          { success: false, message: "Lỗi khi tạo field mappings" },
          { status: 500 },
        );
      }
    }

    // Fetch complete configuration with mappings
    const { data: completeConfig } = await supabase
      .from("mapping_configurations")
      .select(
        `
        *,
        configuration_field_mappings (
          id,
          database_field,
          excel_column_name,
          confidence_score,
          mapping_type,
          validation_passed
        )
      `,
      )
      .eq("id", newConfig.id)
      .single();

    const response: ApiResponse<MappingConfiguration> = {
      success: true,
      data: completeConfig,
      message: "Tạo cấu hình thành công",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Mapping configurations POST error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi tạo cấu hình",
    });
  }
}

// PUT: Save successful mapping as new configuration
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
      MappingConfigurationSaveRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { mapping, file_name, auto_generate_name } = parsed.data;

    const supabase = createServiceClient();

    // Generate configuration name
    const timestamp = getVietnamTimestamp().slice(0, 16);
    const configName = auto_generate_name
      ? `Auto-saved ${file_name || "mapping"} - ${timestamp}`
      : `Manual mapping - ${timestamp}`;

    // Create configuration
    const { data: newConfig, error: configError } = await supabase
      .from("mapping_configurations")
      .insert({
        config_name: configName,
        description: `Tự động lưu từ import thành công - ${file_name || "Unknown file"}`,
        is_default: false,
        is_active: true,
        created_by: adminUser.username,
      })
      .select()
      .single();

    if (configError) {
      console.error("Error creating auto-saved configuration:", configError);
      return NextResponse.json(
        { success: false, message: "Lỗi khi lưu cấu hình" },
        { status: 500 },
      );
    }

    interface MappingConfig {
      database_field: string;
      confidence_score?: number;
      mapping_type?: string;
      validation_status?: string;
    }

    // Create field mappings
    const mappingsToInsert = (
      Object.entries(mapping) as [string, MappingConfig][]
    ).map(([excelColumn, config]) => ({
      config_id: newConfig.id,
      database_field: config.database_field,
      excel_column_name: excelColumn,
      confidence_score: config.confidence_score || 80,
      mapping_type: config.mapping_type || "manual",
      validation_passed: config.validation_status === "valid",
    }));

    const { error: mappingsError } = await supabase
      .from("configuration_field_mappings")
      .insert(mappingsToInsert);

    if (mappingsError) {
      console.error("Error creating auto-saved mappings:", mappingsError);
      return NextResponse.json(
        { success: false, message: "Lỗi khi lưu field mappings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình mapping thành công",
      data: { config_id: newConfig.id, config_name: configName },
    });
  } catch (error) {
    console.error("Auto-save mapping configuration error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lưu cấu hình",
    });
  }
}
