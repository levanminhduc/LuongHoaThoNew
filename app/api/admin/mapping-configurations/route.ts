import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import jwt from "jsonwebtoken";
import {
  type MappingConfiguration,
  type FieldMapping,
  type ConfigurationSearchParams,
  type ApiResponse,
} from "@/lib/column-alias-config";
import { type JWTPayload } from "@/lib/auth";

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
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

// GET: Fetch mapping configurations
export async function GET(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const params: ConfigurationSearchParams = {
      config_name: searchParams.get("config_name") || undefined,
      is_active:
        searchParams.get("is_active") === "true"
          ? true
          : searchParams.get("is_active") === "false"
            ? false
            : undefined,
      is_default:
        searchParams.get("is_default") === "true"
          ? true
          : searchParams.get("is_default") === "false"
            ? false
            : undefined,
      created_by: searchParams.get("created_by") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
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
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tải cấu hình" },
      { status: 500 },
    );
  }
}

// POST: Create new mapping configuration
export async function POST(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      config_name,
      description,
      field_mappings = [],
      is_default = false,
    } = body;

    if (!config_name) {
      return NextResponse.json(
        { success: false, message: "Thiếu tên cấu hình" },
        { status: 400 },
      );
    }

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
      const mappingsToInsert = field_mappings.map((mapping: FieldMapping) => ({
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
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tạo cấu hình" },
      { status: 500 },
    );
  }
}

// PUT: Save successful mapping as new configuration
export async function PUT(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { mapping, file_name, auto_generate_name = true } = body;

    if (!mapping || typeof mapping !== "object") {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin mapping" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Generate configuration name
    const vietnamDate = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const timestamp = vietnamDate.toISOString().slice(0, 16).replace("T", " ");
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
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi lưu cấu hình" },
      { status: 500 },
    );
  }
}
