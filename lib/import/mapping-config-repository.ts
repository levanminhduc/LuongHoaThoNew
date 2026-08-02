import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import type { ConfigurationSearchParams } from "@/lib/column-alias-config";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const CONFIG_WITH_FULL_MAPPINGS_SELECT =
  "*, configuration_field_mappings (id, database_field, excel_column_name, confidence_score, mapping_type, validation_passed)";

const CONFIG_WITH_TEMPLATE_MAPPINGS_SELECT =
  "*, configuration_field_mappings (database_field, excel_column_name, confidence_score, mapping_type)";

const CONFIG_HEADER_MAPPINGS_SELECT =
  "configuration_field_mappings (database_field, excel_column_name)";

export interface ConfigFieldMappingRow {
  config_id: number;
  database_field: string;
  excel_column_name: string;
  confidence_score: number;
  mapping_type: string;
  validation_passed: boolean;
}

export function buildMappingConfigListQuery(
  supabase: SupabaseServiceClient,
  params: ConfigurationSearchParams,
) {
  let query = supabase
    .from("mapping_configurations")
    .select(CONFIG_WITH_FULL_MAPPINGS_SELECT, { count: "exact" });

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

  query = query.order("created_at", { ascending: false });

  const from = ((params.page || 1) - 1) * (params.limit || 20);
  const to = from + (params.limit || 20) - 1;

  return query.range(from, to);
}

export function findConfigByName(
  supabase: SupabaseServiceClient,
  configName: string,
) {
  return supabase
    .from("mapping_configurations")
    .select("id")
    .eq("config_name", configName)
    .single();
}

export function unsetDefaultConfigs(supabase: SupabaseServiceClient) {
  return supabase
    .from("mapping_configurations")
    .update({ is_default: false })
    .eq("is_default", true);
}

export function insertMappingConfig(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase
    .from("mapping_configurations")
    .insert(record)
    .select()
    .single();
}

export function deleteMappingConfig(
  supabase: SupabaseServiceClient,
  configId: number,
) {
  return supabase.from("mapping_configurations").delete().eq("id", configId);
}

export function findConfigWithMappings(
  supabase: SupabaseServiceClient,
  configId: number,
) {
  return supabase
    .from("mapping_configurations")
    .select(CONFIG_WITH_FULL_MAPPINGS_SELECT)
    .eq("id", configId)
    .single();
}

export function findActiveConfigForTemplate(
  supabase: SupabaseServiceClient,
  configId: string,
) {
  return supabase
    .from("mapping_configurations")
    .select(CONFIG_WITH_TEMPLATE_MAPPINGS_SELECT)
    .eq("id", configId)
    .eq("is_active", true)
    .single();
}

export function findLatestConfigUpdatedAt(supabase: SupabaseServiceClient) {
  return supabase
    .from("mapping_configurations")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
}

export function findActiveConfigHeaderMappings(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("mapping_configurations")
    .select(CONFIG_HEADER_MAPPINGS_SELECT)
    .eq("is_active", true);
}

export function insertConfigFieldMappings(
  supabase: SupabaseServiceClient,
  rows: ConfigFieldMappingRow[],
) {
  return supabase.from("configuration_field_mappings").insert(rows);
}
