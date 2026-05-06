import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, downloadBlob } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import type {
  ApiResponse,
  ColumnAlias,
  EnhancedColumnMapping,
  FieldMapping,
  MappingConfiguration,
} from "@/lib/column-alias-config";

export interface ColumnAliasesFilters {
  databaseField?: string;
  aliasName?: string;
  isActive?: boolean;
  createdBy?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  page?: number;
  limit?: number;
  sortBy?: "alias_name" | "confidence_score" | "created_at" | "database_field";
  sortOrder?: "asc" | "desc";
}

export interface MappingConfigurationsFilters {
  configName?: string;
  isActive?: boolean;
  isDefault?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  timestampOnly?: boolean;
}

export interface MappingConfigurationWithFields extends MappingConfiguration {
  configuration_field_mappings?: FieldMapping[];
}

export interface ColumnAliasInput {
  database_field: string;
  alias_name: string;
  confidence_score: number;
  config_id?: number;
}

export interface UpdateColumnAliasInput {
  id: number;
  alias_name: string;
  confidence_score: number;
  is_active?: boolean;
}

export interface SaveMappingConfigurationInput {
  mapping: EnhancedColumnMapping | Record<string, unknown>;
  file_name?: string;
  auto_generate_name?: boolean;
}

export interface AdvancedUploadInput {
  payrollData: unknown[];
  columnMappings: unknown;
  summary: unknown;
}

export interface GenerateImportTemplateInput {
  configId: number;
  configName?: string;
}

export interface AliasesForConfigurationInput {
  aliases: ColumnAliasInput[];
  configId: number;
}

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function assertApiSuccess<T>(response: ApiResponse<T>, fallback: string) {
  if (!response.success) {
    throw new Error(response.message || fallback);
  }
  return response;
}

function columnAliasesParams(filters: ColumnAliasesFilters) {
  const params = new URLSearchParams();

  if (filters.databaseField) {
    params.set(QUERY_PARAMS.DATABASE_FIELD, filters.databaseField);
  }
  if (filters.aliasName) {
    params.set(QUERY_PARAMS.ALIAS_NAME, filters.aliasName);
  }
  if (filters.isActive !== undefined) {
    params.set(QUERY_PARAMS.IS_ACTIVE, filters.isActive ? "true" : "false");
  }
  if (filters.createdBy) {
    params.set(QUERY_PARAMS.CREATED_BY, filters.createdBy);
  }
  if (filters.confidenceMin !== undefined) {
    params.set(QUERY_PARAMS.CONFIDENCE_MIN, String(filters.confidenceMin));
  }
  if (filters.confidenceMax !== undefined) {
    params.set(QUERY_PARAMS.CONFIDENCE_MAX, String(filters.confidenceMax));
  }
  if (filters.page) {
    params.set(QUERY_PARAMS.PAGE, String(filters.page));
  }
  if (filters.limit) {
    params.set(QUERY_PARAMS.LIMIT, String(filters.limit));
  }
  if (filters.sortBy) {
    params.set(QUERY_PARAMS.SORT_BY, filters.sortBy);
  }
  if (filters.sortOrder) {
    params.set(QUERY_PARAMS.SORT_ORDER, filters.sortOrder);
  }

  return params;
}

function mappingConfigurationsParams(filters: MappingConfigurationsFilters) {
  const params = new URLSearchParams();

  if (filters.configName) {
    params.set(QUERY_PARAMS.CONFIG_NAME, filters.configName);
  }
  if (filters.isActive !== undefined) {
    params.set(QUERY_PARAMS.IS_ACTIVE, filters.isActive ? "true" : "false");
  }
  if (filters.isDefault !== undefined) {
    params.set(QUERY_PARAMS.IS_DEFAULT, filters.isDefault ? "true" : "false");
  }
  if (filters.createdBy) {
    params.set(QUERY_PARAMS.CREATED_BY, filters.createdBy);
  }
  if (filters.page) {
    params.set(QUERY_PARAMS.PAGE, String(filters.page));
  }
  if (filters.limit) {
    params.set(QUERY_PARAMS.LIMIT, String(filters.limit));
  }
  if (filters.timestampOnly) {
    params.set(QUERY_PARAMS.TIMESTAMP_ONLY, "true");
  }

  return params;
}

export function useColumnAliasesQuery(
  filters: ColumnAliasesFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["column-aliases", filters],
    queryFn: ({ signal }) =>
      apiClient
        .get<ApiResponse<ColumnAlias[]>>(
          appendParams(
            ENDPOINTS.columnAliases.list,
            columnAliasesParams(filters),
          ),
          { signal },
        )
        .then((response) =>
          assertApiSuccess(response, "Lỗi khi tải danh sách aliases"),
        ),
    enabled,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useMappingConfigurationsQuery(
  filters: MappingConfigurationsFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["mapping-configurations", filters],
    queryFn: ({ signal }) =>
      apiClient
        .get<ApiResponse<MappingConfigurationWithFields[]>>(
          appendParams(
            ENDPOINTS.mappingConfigs.list,
            mappingConfigurationsParams(filters),
          ),
          { signal },
        )
        .then((response) =>
          assertApiSuccess(response, "Lỗi khi tải danh sách cấu hình"),
        ),
    enabled,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useCreateColumnAliasMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ColumnAliasInput) =>
      apiClient
        .post<ApiResponse<ColumnAlias>>(ENDPOINTS.columnAliases.list, input)
        .then((response) => assertApiSuccess(response, "Lỗi khi tạo alias")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-aliases"] });
    },
  });
}

export function useUpdateColumnAliasMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateColumnAliasInput) =>
      apiClient
        .put<ApiResponse<ColumnAlias>>(ENDPOINTS.columnAliases.detail(id), input)
        .then((response) =>
          assertApiSuccess(response, "Lỗi khi cập nhật alias"),
        ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-aliases"] });
    },
  });
}

export function useDeleteColumnAliasMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient
        .delete<ApiResponse<never>>(ENDPOINTS.columnAliases.detail(id))
        .then((response) => assertApiSuccess(response, "Lỗi khi xóa alias")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-aliases"] });
    },
  });
}

export function useSaveMappingConfigurationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveMappingConfigurationInput) =>
      apiClient
        .put<ApiResponse<{ config_id: number; config_name: string }>>(
          ENDPOINTS.mappingConfigs.update,
          input,
        )
        .then((response) =>
          assertApiSuccess(response, "Lỗi khi lưu cấu hình mapping"),
        ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-configurations"] });
    },
  });
}

export function useAdvancedUploadMutation() {
  return useMutation({
    mutationFn: (input: AdvancedUploadInput) =>
      apiClient.post<{ success?: boolean; error?: string; message?: string }>(
        ENDPOINTS.payroll.advancedUpload,
        input,
      ),
  });
}

export function useGenerateImportTemplateMutation() {
  return useMutation({
    mutationFn: async (input: GenerateImportTemplateInput) => {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.CONFIG_ID, String(input.configId));

      const { blob, filename } = await apiClient.blob(
        appendParams(ENDPOINTS.templates.importGenerated, params),
      );
      const date = getVietnamTimestamp().slice(0, 10);
      const configName = input.configName || "template";
      const finalName =
        filename ??
        `import-template-${configName.replace(/\s+/g, "-")}-${date}.xlsx`;

      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
  });
}

export function useCreateAliasesForConfigurationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AliasesForConfigurationInput) => {
      const results = [];

      for (const alias of input.aliases) {
        try {
          const response = await apiClient.post<ApiResponse<ColumnAlias>>(
            ENDPOINTS.columnAliases.list,
            {
              database_field: alias.database_field,
              alias_name: alias.alias_name,
              confidence_score: alias.confidence_score,
              config_id: input.configId,
            },
          );
          results.push({
            success: response.success,
            alias,
            message: response.message,
          });
        } catch (error) {
          results.push({
            success: false,
            alias,
            message: error instanceof Error ? error.message : "Lỗi không xác định",
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-aliases"] });
    },
  });
}
