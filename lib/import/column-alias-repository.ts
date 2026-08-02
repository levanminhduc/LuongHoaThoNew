import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import type { AliasSearchParams, ColumnAlias } from "@/lib/column-alias-config";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const COLUMN_ALIAS_SELECT =
  "id, database_field, alias_name, confidence_score, is_active, created_by, created_at, updated_at, config_id";

const ACTIVE_ALIAS_SELECT = "database_field, alias_name";

export interface AliasDuplicateKey {
  database_field: string;
  alias_name: string;
  config_id?: number | null;
}

export function buildColumnAliasListQuery(
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

  return query.range(from, to);
}

export function findAliasByDuplicateKey(
  supabase: SupabaseServiceClient,
  key: AliasDuplicateKey,
) {
  const query = supabase
    .from("column_aliases")
    .select("id")
    .eq("database_field", key.database_field)
    .eq("alias_name", key.alias_name);

  const scoped = key.config_id
    ? query.eq("config_id", key.config_id)
    : query.is("config_id", null);

  return scoped.single();
}

export function findAliasByFieldAndName(
  supabase: SupabaseServiceClient,
  databaseField: string,
  aliasName: string,
) {
  return supabase
    .from("column_aliases")
    .select("id")
    .eq("database_field", databaseField)
    .eq("alias_name", aliasName)
    .single();
}

export function findAliasByFieldAndNameExcluding(
  supabase: SupabaseServiceClient,
  databaseField: string,
  aliasName: string,
  excludedAliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select("id")
    .eq("database_field", databaseField)
    .eq("alias_name", aliasName)
    .neq("id", excludedAliasId)
    .single();
}

export function insertColumnAlias(
  supabase: SupabaseServiceClient,
  aliasData: Partial<ColumnAlias>,
) {
  return supabase.from("column_aliases").insert(aliasData).select().single();
}

export function insertColumnAliasWithoutReturn(
  supabase: SupabaseServiceClient,
  aliasData: Partial<ColumnAlias>,
) {
  return supabase.from("column_aliases").insert(aliasData);
}

export function findColumnAliasById(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select(COLUMN_ALIAS_SELECT)
    .eq("id", aliasId)
    .single();
}

export function findAliasDatabaseField(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select("database_field")
    .eq("id", aliasId)
    .single();
}

export function findAliasName(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase
    .from("column_aliases")
    .select("id, alias_name")
    .eq("id", aliasId)
    .single();
}

export function updateColumnAlias(
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

export function deleteColumnAlias(
  supabase: SupabaseServiceClient,
  aliasId: number,
) {
  return supabase.from("column_aliases").delete().eq("id", aliasId);
}

export function findActiveAliases(supabase: SupabaseServiceClient) {
  return supabase
    .from("column_aliases")
    .select(ACTIVE_ALIAS_SELECT)
    .eq("is_active", true);
}
