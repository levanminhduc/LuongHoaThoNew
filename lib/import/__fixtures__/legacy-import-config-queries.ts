import type {
  AliasSearchParams,
  ColumnAlias,
  ConfigurationSearchParams,
} from "@/lib/column-alias-config";
import type { SupabaseServiceClient } from "../column-alias-repository";
import type { ConfigFieldMappingRow } from "../mapping-config-repository";

/** app/api/admin/column-aliases/route.ts:51-81 tại commit adc8540 */
export function legacyColumnAliasListQuery(
  supabase: SupabaseServiceClient,
  params: AliasSearchParams,
) {
  let query = supabase.from("column_aliases").select("*", { count: "exact" });

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

  query = query.order(params.sort_by!, {
    ascending: params.sort_order === "asc",
  });

  const from = ((params.page || 1) - 1) * (params.limit || 50);
  const to = from + (params.limit || 50) - 1;
  query = query.range(from, to);

  return query;
}

/** app/api/admin/column-aliases/route.ts:141-153 tại commit adc8540 */
export function legacyDuplicateAliasQuery(
  supabase: SupabaseServiceClient,
  database_field: string,
  alias_name: string,
  config_id?: number | null,
) {
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

  return duplicateQuery.single();
}

/** app/api/admin/column-aliases/route.ts:178-182 tại commit adc8540 */
export function legacyInsertAliasQuery(
  supabase: SupabaseServiceClient,
  aliasData: Partial<ColumnAlias>,
) {
  return supabase.from("column_aliases").insert(aliasData).select().single();
}

/** app/api/admin/column-aliases/route.ts:250-255 tại commit adc8540 */
export function legacyBulkDuplicateAliasQuery(
  supabase: SupabaseServiceClient,
  database_field: string,
  alias_name: string,
) {
  return supabase
    .from("column_aliases")
    .select("id")
    .eq("database_field", database_field)
    .eq("alias_name", alias_name)
    .single();
}

/** app/api/admin/column-aliases/route.ts:263-269 tại commit adc8540 */
export function legacyBulkInsertAliasQuery(
  supabase: SupabaseServiceClient,
  aliasData: Partial<ColumnAlias>,
) {
  return supabase.from("column_aliases").insert(aliasData);
}

/** app/api/admin/column-aliases/[id]/route.ts:41-45 tại commit adc8540 */
export function legacyAliasByIdQuery(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select(
      "id, database_field, alias_name, confidence_score, is_active, created_by, created_at, updated_at, config_id",
    )
    .eq("id", aliasId)
    .single();
}

/** app/api/admin/column-aliases/[id]/route.ts:107-111 tại commit adc8540 */
export function legacyAliasDatabaseFieldQuery(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select("database_field")
    .eq("id", aliasId)
    .single();
}

/** app/api/admin/column-aliases/[id]/route.ts:121-127 tại commit adc8540 */
export function legacyDuplicateAliasExcludingQuery(
  supabase: SupabaseServiceClient,
  database_field: string,
  alias_name: string,
  aliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select("id")
    .eq("database_field", database_field)
    .eq("alias_name", alias_name)
    .neq("id", aliasId)
    .single();
}

/** app/api/admin/column-aliases/[id]/route.ts:152-157 tại commit adc8540 */
export function legacyUpdateAliasQuery(
  supabase: SupabaseServiceClient,
  aliasId: number,
  updateData: Partial<ColumnAlias>,
) {
  return supabase
    .from("column_aliases")
    .update(updateData)
    .eq("id", aliasId)
    .select()
    .single();
}

/** app/api/admin/column-aliases/[id]/route.ts:210-214 tại commit adc8540 */
export function legacyAliasNameQuery(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select("id, alias_name")
    .eq("id", aliasId)
    .single();
}

/** app/api/admin/column-aliases/[id]/route.ts:224-227 tại commit adc8540 */
export function legacyDeleteAliasQuery(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase.from("column_aliases").delete().eq("id", aliasId);
}

/** app/api/admin/payroll-import/route.ts:54-57 tại commit adc8540 */
export function legacyActiveAliasesQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("column_aliases")
    .select("database_field, alias_name")
    .eq("is_active", true);
}

/** app/api/admin/mapping-configurations/route.ts:49-83 tại commit adc8540 */
export function legacyMappingConfigListQuery(
  supabase: SupabaseServiceClient,
  params: ConfigurationSearchParams,
) {
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
  query = query.range(from, to);

  return query;
}

/** app/api/admin/mapping-configurations/route.ts:143-147 tại commit adc8540 */
export function legacyConfigByNameQuery(
  supabase: SupabaseServiceClient,
  config_name: string,
) {
  return supabase
    .from("mapping_configurations")
    .select("id")
    .eq("config_name", config_name)
    .single();
}

/** app/api/admin/mapping-configurations/route.ts:158-161 tại commit adc8540 */
export function legacyUnsetDefaultConfigsQuery(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("mapping_configurations")
    .update({ is_default: false })
    .eq("is_default", true);
}

/** app/api/admin/mapping-configurations/route.ts:165-175 tại commit adc8540 */
export function legacyInsertConfigQuery(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase
    .from("mapping_configurations")
    .insert(record)
    .select()
    .single();
}

/** app/api/admin/mapping-configurations/route.ts:196-198 tại commit adc8540 */
export function legacyInsertFieldMappingsQuery(
  supabase: SupabaseServiceClient,
  rows: ConfigFieldMappingRow[],
) {
  return supabase.from("configuration_field_mappings").insert(rows);
}

/** app/api/admin/mapping-configurations/route.ts:203-206 tại commit adc8540 */
export function legacyRollbackConfigQuery(
  supabase: SupabaseServiceClient,
  configId: number,
) {
  return supabase.from("mapping_configurations").delete().eq("id", configId);
}

/** app/api/admin/mapping-configurations/route.ts:216-232 tại commit adc8540 */
export function legacyCompleteConfigQuery(
  supabase: SupabaseServiceClient,
  configId: number,
) {
  return supabase
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
    .eq("id", configId)
    .single();
}

/** app/api/admin/payroll-export-template/route.ts:143-148 tại commit adc8540 */
export function legacyLatestConfigUpdatedAtQuery(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("mapping_configurations")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
}

/** app/api/admin/payroll-export-template/route.ts:165-180 tại commit adc8540 */
export function legacyTemplateConfigQuery(
  supabase: SupabaseServiceClient,
  configId: string,
) {
  return supabase
    .from("mapping_configurations")
    .select(
      `
          *,
          configuration_field_mappings (
            database_field,
            excel_column_name,
            confidence_score,
            mapping_type
          )
        `,
    )
    .eq("id", configId)
    .eq("is_active", true)
    .single();
}

/** app/api/admin/generate-import-template/route.ts:36-51 tại commit adc8540 */
export function legacyGenerateTemplateConfigQuery(
  supabase: SupabaseServiceClient,
  configId: string,
) {
  return supabase
    .from("mapping_configurations")
    .select(
      `
        *,
        configuration_field_mappings (
          database_field,
          excel_column_name,
          confidence_score,
          mapping_type
        )
      `,
    )
    .eq("id", configId)
    .eq("is_active", true)
    .single();
}

/** app/api/admin/payroll-import/route.ts:71-81 tại commit adc8540 */
export function legacyActiveConfigMappingsQuery(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("mapping_configurations")
    .select(
      `
        configuration_field_mappings (
          database_field,
          excel_column_name
        )
      `,
    )
    .eq("is_active", true);
}
