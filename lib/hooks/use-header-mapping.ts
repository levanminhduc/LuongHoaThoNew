/**
 * React Hooks for Header Mapping
 * Provides convenient hooks for header mapping operations
 */

import { useMemo, useCallback } from "react";
import {
  mapFieldsToHeaders,
  createReverseHeaderMapping,
  validateHeaderMapping,
  mergeHeaderMappings,
  generateHeaderMappingPreview,
  formatFieldNameAsHeader,
  type HeaderMappingResult,
  type HeaderMappingOptions,
} from "@/lib/utils/header-mapping";
import { useMappingConfig } from "./use-mapping-config";
import type { MappingConfiguration } from "@/lib/column-alias-config";

// ===== MAIN HEADER MAPPING HOOK =====

export interface UseHeaderMappingReturn {
  // Core mapping functions
  mapHeaders: (
    fields: string[],
    configId?: number,
    options?: HeaderMappingOptions,
  ) => HeaderMappingResult;
  getReverseMapping: (
    configId?: number,
    includeDefaults?: boolean,
  ) => Record<string, string>;
  formatFieldName: (fieldName: string) => string;

  // Validation
  validateMapping: (
    configId: number,
    requiredFields?: string[],
  ) => {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    coverage: number;
  };

  // Preview and analysis
  generatePreview: (
    fields: string[],
    configId?: number,
  ) => {
    preview: Array<{
      field: string;
      header: string;
      source: "configuration" | "default" | "fallback";
      confidence: number;
    }>;
    summary: {
      total: number;
      fromConfig: number;
      fromDefault: number;
      fallback: number;
      averageConfidence: number;
    };
  };

  // Merge operations
  mergeConfigurations: (
    configIds: number[],
    conflictResolution?: "highest_confidence" | "latest" | "first",
  ) => Record<string, string>;

  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Main hook for header mapping operations
 */
export const useHeaderMapping = (): UseHeaderMappingReturn => {
  const { isLoading, error, configById } = useMappingConfig();

  // Map fields to headers
  const mapHeaders = useCallback(
    (
      fields: string[],
      configId?: number,
      options?: HeaderMappingOptions,
    ): HeaderMappingResult => {
      const configuration = configId ? configById(configId) : undefined;
      return mapFieldsToHeaders(fields, configuration, options);
    },
    [configById],
  );

  // Get reverse mapping
  const getReverseMapping = useCallback(
    (configId?: number, includeDefaults = true): Record<string, string> => {
      const configuration = configId ? configById(configId) : undefined;
      return createReverseHeaderMapping(configuration, includeDefaults);
    },
    [configById],
  );

  // Format field name
  const formatFieldName = useCallback((fieldName: string): string => {
    return formatFieldNameAsHeader(fieldName);
  }, []);

  // Validate mapping
  const validateMapping = useCallback(
    (configId: number, requiredFields: string[] = []) => {
      const configuration = configById(configId);
      if (!configuration) {
        return {
          isValid: false,
          errors: ["Configuration not found"],
          warnings: [],
          coverage: 0,
        };
      }
      return validateHeaderMapping(configuration, requiredFields);
    },
    [configById],
  );

  // Generate preview
  const generatePreview = useCallback(
    (fields: string[], configId?: number) => {
      const configuration = configId ? configById(configId) : undefined;
      return generateHeaderMappingPreview(fields, configuration);
    },
    [configById],
  );

  // Merge configurations
  const mergeConfigurations = useCallback(
    (
      configIds: number[],
      conflictResolution:
        | "highest_confidence"
        | "latest"
        | "first" = "highest_confidence",
    ): Record<string, string> => {
      const configs = configIds
        .map((id) => configById(id))
        .filter(
          (config): config is MappingConfiguration => config !== undefined,
        );

      return mergeHeaderMappings(configs, conflictResolution);
    },
    [configById],
  );

  return {
    mapHeaders,
    getReverseMapping,
    formatFieldName,
    validateMapping,
    generatePreview,
    mergeConfigurations,
    isLoading,
    error,
  };
};

// ===== SPECIALIZED HOOKS =====

/**
 * Hook for specific configuration header mapping
 */
export const useConfigHeaderMapping = (configId?: number) => {
  const { configById } = useMappingConfig();
  const configuration = configId ? configById(configId) : undefined;

  const headers = useMemo(() => {
    if (!configuration?.field_mappings) return {};

    const headerMap: Record<string, string> = {};
    configuration.field_mappings.forEach((mapping) => {
      headerMap[mapping.database_field] = mapping.excel_column_name;
    });
    return headerMap;
  }, [configuration]);

  const reverseHeaders = useMemo(() => {
    return createReverseHeaderMapping(configuration);
  }, [configuration]);

  const getHeader = useCallback(
    (field: string): string => {
      return headers[field] || formatFieldNameAsHeader(field);
    },
    [headers],
  );

  const getField = useCallback(
    (header: string): string | undefined => {
      const normalizedHeader = header.toLowerCase().trim();
      return reverseHeaders[normalizedHeader];
    },
    [reverseHeaders],
  );

  return {
    configuration,
    headers,
    reverseHeaders,
    getHeader,
    getField,
    hasMapping: Object.keys(headers).length > 0,
  };
};

/**
 * Hook for field validation with header mapping
 */
export const useFieldValidation = (requiredFields: string[] = []) => {
  const { configurations } = useMappingConfig();

  const validateFields = useCallback(
    (fields: string[], configId?: number) => {
      const missingFields = requiredFields.filter(
        (field) => !fields.includes(field),
      );
      const extraFields = fields.filter(
        (field) => !requiredFields.includes(field),
      );

      let mappingValidation = null;
      if (configId) {
        const config = configurations.find((c) => c.id === configId);
        if (config) {
          mappingValidation = validateHeaderMapping(config, requiredFields);
        }
      }

      return {
        isValid: missingFields.length === 0,
        missingFields,
        extraFields,
        coverage:
          requiredFields.length > 0
            ? ((requiredFields.length - missingFields.length) /
                requiredFields.length) *
              100
            : 100,
        mappingValidation,
      };
    },
    [requiredFields, configurations],
  );

  return { validateFields, requiredFields };
};

/**
 * Hook for header mapping preview with real-time updates
 */
export const useHeaderMappingPreview = (
  fields: string[],
  configId?: number,
) => {
  const { configById } = useMappingConfig();

  const preview = useMemo(() => {
    const configuration = configId ? configById(configId) : undefined;
    return generateHeaderMappingPreview(fields, configuration);
  }, [fields, configId, configById]);

  const getFieldPreview = useCallback(
    (field: string) => {
      return preview.preview.find((p) => p.field === field);
    },
    [preview],
  );

  const getHeadersBySource = useCallback(
    (source: "configuration" | "default" | "fallback") => {
      return preview.preview.filter((p) => p.source === source);
    },
    [preview],
  );

  const getLowConfidenceFields = useCallback(
    (threshold = 50) => {
      return preview.preview.filter((p) => p.confidence < threshold);
    },
    [preview],
  );

  return {
    preview: preview.preview,
    summary: preview.summary,
    getFieldPreview,
    getHeadersBySource,
    getLowConfidenceFields,
  };
};

/**
 * Hook for dynamic header mapping with multiple configurations
 */
export const useDynamicHeaderMapping = () => {
  const { configurations } = useMappingConfig();

  const createDynamicMapping = useCallback(
    (
      fields: string[],
      primaryConfigId?: number,
      fallbackConfigIds: number[] = [],
      options: HeaderMappingOptions = {},
    ) => {
      const allConfigIds = primaryConfigId
        ? [primaryConfigId, ...fallbackConfigIds]
        : fallbackConfigIds;

      const configs = allConfigIds
        .map((id) => configurations.find((c) => c.id === id))
        .filter(
          (config): config is MappingConfiguration => config !== undefined,
        );

      if (configs.length === 0) {
        return mapFieldsToHeaders(fields, undefined, options);
      }

      // Try each configuration in order
      const results: HeaderMappingResult[] = [];
      for (const config of configs) {
        const result = mapFieldsToHeaders(fields, config, options);
        results.push(result);
      }

      // Merge results, prioritizing earlier configurations
      const mergedHeaders: Record<string, string> = {};
      const processedFields = new Set<string>();

      for (const result of results) {
        Object.entries(result.headers).forEach(([field, header]) => {
          if (!processedFields.has(field)) {
            mergedHeaders[field] = header;
            processedFields.add(field);
          }
        });
      }

      // Calculate merged statistics
      const mappedCount = Object.keys(mergedHeaders).length;
      const unmappedFields = fields.filter((field) => !mergedHeaders[field]);
      const totalConfidence = results.reduce(
        (sum, result) => sum + result.confidence,
        0,
      );
      const averageConfidence =
        results.length > 0 ? totalConfidence / results.length : 0;

      return {
        headers: mergedHeaders,
        mappedCount,
        unmappedFields,
        confidence: averageConfidence,
        source: "configuration" as const,
        results, // Include individual results for analysis
      };
    },
    [configurations],
  );

  return { createDynamicMapping };
};

/**
 * Hook for header mapping statistics and analytics
 */
export const useHeaderMappingStats = () => {
  const { configurations } = useMappingConfig();

  const stats = useMemo(() => {
    const totalConfigs = configurations.length;
    const activeConfigs = configurations.filter((c) => c.is_active).length;
    const totalMappings = configurations.reduce(
      (sum, config) => sum + (config.field_mappings?.length || 0),
      0,
    );

    const avgMappingsPerConfig =
      totalConfigs > 0 ? totalMappings / totalConfigs : 0;

    const confidenceDistribution = {
      high: 0, // >= 80
      medium: 0, // 50-79
      low: 0, // < 50
    };

    configurations.forEach((config) => {
      config.field_mappings?.forEach((mapping) => {
        if (mapping.confidence_score >= 80) {
          confidenceDistribution.high++;
        } else if (mapping.confidence_score >= 50) {
          confidenceDistribution.medium++;
        } else {
          confidenceDistribution.low++;
        }
      });
    });

    const mostUsedFields = new Map<string, number>();
    configurations.forEach((config) => {
      config.field_mappings?.forEach((mapping) => {
        const count = mostUsedFields.get(mapping.database_field) || 0;
        mostUsedFields.set(mapping.database_field, count + 1);
      });
    });

    const topFields = Array.from(mostUsedFields.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      totalConfigs,
      activeConfigs,
      totalMappings,
      avgMappingsPerConfig: Math.round(avgMappingsPerConfig * 100) / 100,
      confidenceDistribution,
      topFields,
    };
  }, [configurations]);

  return stats;
};
