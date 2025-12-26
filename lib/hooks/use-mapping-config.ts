/**
 * Custom Hooks for Mapping Configuration Management
 * Provides convenient hooks for common mapping config operations
 */

import { useEffect, useCallback, useMemo } from "react";
import {
  useMappingConfigStore,
  type ConfigNotification,
} from "@/lib/stores/mapping-config-store";
import type { MappingConfiguration } from "@/lib/column-alias-config";

// ===== MAIN HOOK =====

export interface UseMappingConfigReturn {
  // State
  configurations: MappingConfiguration[];
  defaultConfig: MappingConfiguration | null;
  currentConfig: MappingConfiguration | null;
  isLoading: boolean;
  error: string | null;
  notifications: ConfigNotification[];
  unreadCount: number;

  // Actions
  loadConfigurations: () => Promise<void>;
  loadDefaultConfiguration: () => Promise<void>;
  saveConfiguration: (
    config: Omit<MappingConfiguration, "id">,
  ) => Promise<MappingConfiguration>;
  updateConfiguration: (
    id: number,
    updates: Partial<MappingConfiguration>,
  ) => Promise<void>;
  deleteConfiguration: (id: number) => Promise<void>;
  setDefaultConfiguration: (id: number) => Promise<void>;
  setCurrentConfig: (config: MappingConfiguration | null) => void;
  applyConfiguration: (id: number) => Promise<void>;
  clearCurrentConfig: () => void;

  // Notifications
  addNotification: (
    notification: Omit<ConfigNotification, "id" | "timestamp">,
  ) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  clearAllNotifications: () => void;

  // Utilities
  invalidateCache: () => void;
  refreshConfigurations: () => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // Computed
  hasConfigurations: boolean;
  hasDefaultConfig: boolean;
  isConfigApplied: boolean;
  configById: (id: number) => MappingConfiguration | undefined;
  configByName: (name: string) => MappingConfiguration | undefined;
}

/**
 * Main hook for mapping configuration management
 * Provides all necessary state and actions for working with mapping configs
 */
export const useMappingConfig = (): UseMappingConfigReturn => {
  // Get all state and actions directly from store to avoid infinite loops
  const store = useMappingConfigStore();

  // Computed values
  const hasConfigurations = store.configurations.length > 0;
  const hasDefaultConfig = store.defaultConfig !== null;
  const isConfigApplied = store.currentConfig !== null;

  const configById = useCallback(
    (id: number) => {
      return store.configurations.find((config) => config.id === id);
    },
    [store.configurations],
  );

  const configByName = useCallback(
    (name: string) => {
      return store.configurations.find((config) => config.config_name === name);
    },
    [store.configurations],
  );

  return {
    // State
    configurations: store.configurations,
    defaultConfig: store.defaultConfig,
    currentConfig: store.currentConfig,
    isLoading: store.isLoading,
    error: store.error,
    notifications: store.notifications,
    unreadCount: store.unreadCount,

    // Actions
    loadConfigurations: store.loadConfigurations,
    loadDefaultConfiguration: store.loadDefaultConfiguration,
    saveConfiguration: store.saveConfiguration,
    updateConfiguration: store.updateConfiguration,
    deleteConfiguration: store.deleteConfiguration,
    setDefaultConfiguration: store.setDefaultConfiguration,
    setCurrentConfig: store.setCurrentConfig,
    applyConfiguration: store.applyConfiguration,
    clearCurrentConfig: store.clearCurrentConfig,
    addNotification: store.addNotification,
    markNotificationRead: store.markNotificationRead,
    clearNotifications: store.clearNotifications,
    clearAllNotifications: store.clearAllNotifications,
    invalidateCache: store.invalidateCache,
    refreshConfigurations: store.refreshConfigurations,
    clearError: store.clearError,
    reset: store.reset,

    // Computed
    hasConfigurations,
    hasDefaultConfig,
    isConfigApplied,
    configById,
    configByName,
  };
};

// ===== SPECIALIZED HOOKS =====

/**
 * Hook for auto-loading configurations on component mount
 * Automatically loads configurations and default config when component mounts
 */
export const useAutoLoadConfigurations = (options?: {
  loadOnMount?: boolean;
  loadDefault?: boolean;
}) => {
  const { loadOnMount = true, loadDefault = true } = options || {};
  const { loadConfigurations, loadDefaultConfiguration, isLoading, error } =
    useMappingConfig();

  useEffect(() => {
    if (loadOnMount) {
      loadConfigurations();
      if (loadDefault) {
        loadDefaultConfiguration();
      }
    }
  }, [loadOnMount, loadDefault, loadConfigurations, loadDefaultConfiguration]);

  return { isLoading, error };
};

/**
 * Hook for managing current configuration state
 * Provides utilities for applying and managing the currently active config
 */
export const useCurrentMappingConfig = () => {
  const {
    currentConfig,
    defaultConfig,
    applyConfiguration,
    clearCurrentConfig,
  } = useMappingConfig();

  const applyDefaultConfig = useCallback(async () => {
    if (defaultConfig?.id) {
      await applyConfiguration(defaultConfig.id);
    }
  }, [defaultConfig, applyConfiguration]);

  const hasCurrentConfig = currentConfig !== null;
  const isDefaultApplied = currentConfig?.id === defaultConfig?.id;

  return {
    currentConfig,
    hasCurrentConfig,
    isDefaultApplied,
    applyConfiguration,
    applyDefaultConfig,
    clearCurrentConfig,
  };
};

/**
 * Hook for configuration notifications management
 * Provides utilities for managing and displaying notifications
 */
export const useConfigNotifications = () => {
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    clearNotifications,
    clearAllNotifications,
  } = useMappingConfig();

  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.read);
  }, [notifications]);

  const readNotifications = useMemo(() => {
    return notifications.filter((n) => n.read);
  }, [notifications]);

  const markAllAsRead = useCallback(() => {
    notifications.forEach((notification) => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
  }, [notifications, markNotificationRead]);

  const getNotificationsByType = useCallback(
    (type: ConfigNotification["type"]) => {
      return notifications.filter((n) => n.type === type);
    },
    [notifications],
  );

  return {
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    markNotificationRead,
    markAllAsRead,
    clearNotifications,
    clearAllNotifications,
    getNotificationsByType,
  };
};

/**
 * Hook for configuration validation and preview
 * Provides utilities for validating and previewing mapping configurations
 */
export const useConfigValidation = () => {
  const { configurations } = useMappingConfig();

  const validateConfiguration = useCallback(
    (config: Partial<MappingConfiguration>) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate config name
      if (!config.config_name?.trim()) {
        errors.push("Tên configuration không được để trống");
      } else if (config.config_name.length < 3) {
        warnings.push("Tên configuration nên có ít nhất 3 ký tự");
      }

      // Check for duplicate names (excluding current config if updating)
      const duplicateName = configurations.find(
        (c) => c.config_name === config.config_name && c.id !== config.id,
      );
      if (duplicateName) {
        errors.push("Tên configuration đã tồn tại");
      }

      // Validate field mappings
      if (!config.field_mappings || config.field_mappings.length === 0) {
        warnings.push("Configuration chưa có field mappings");
      } else {
        const mappings = config.field_mappings;
        const duplicateFields = mappings
          .map((m) => m.database_field)
          .filter((field, index, arr) => arr.indexOf(field) !== index);

        if (duplicateFields.length > 0) {
          errors.push(
            `Có field mappings trùng lặp: ${duplicateFields.join(", ")}`,
          );
        }

        const duplicateColumns = mappings
          .map((m) => m.excel_column_name)
          .filter((column, index, arr) => arr.indexOf(column) !== index);

        if (duplicateColumns.length > 0) {
          errors.push(
            `Có Excel columns trùng lặp: ${duplicateColumns.join(", ")}`,
          );
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        hasWarnings: warnings.length > 0,
      };
    },
    [configurations],
  );

  const previewConfiguration = useCallback((config: MappingConfiguration) => {
    const fieldMappings = config.field_mappings || [];
    const mappedFields = fieldMappings.map((m) => m.database_field);
    const mappedColumns = fieldMappings.map((m) => m.excel_column_name);

    const highConfidenceMappings = fieldMappings.filter(
      (m) => m.confidence_score >= 80,
    );
    const lowConfidenceMappings = fieldMappings.filter(
      (m) => m.confidence_score < 50,
    );

    return {
      totalMappings: fieldMappings.length,
      mappedFields,
      mappedColumns,
      highConfidenceCount: highConfidenceMappings.length,
      lowConfidenceCount: lowConfidenceMappings.length,
      averageConfidence:
        fieldMappings.length > 0
          ? Math.round(
              fieldMappings.reduce((sum, m) => sum + m.confidence_score, 0) /
                fieldMappings.length,
            )
          : 0,
      mappingTypes: {
        exact: fieldMappings.filter((m) => m.mapping_type === "exact").length,
        fuzzy: fieldMappings.filter((m) => m.mapping_type === "fuzzy").length,
        manual: fieldMappings.filter((m) => m.mapping_type === "manual").length,
        alias: fieldMappings.filter((m) => m.mapping_type === "alias").length,
      },
    };
  }, []);

  return {
    validateConfiguration,
    previewConfiguration,
  };
};

/**
 * Hook for configuration search and filtering
 * Provides utilities for searching and filtering configurations
 */
export const useConfigSearch = () => {
  const { configurations } = useMappingConfig();

  const searchConfigurations = useCallback(
    (query: string) => {
      if (!query.trim()) return configurations;

      const lowercaseQuery = query.toLowerCase();
      return configurations.filter(
        (config) =>
          config.config_name.toLowerCase().includes(lowercaseQuery) ||
          config.description?.toLowerCase().includes(lowercaseQuery) ||
          config.created_by.toLowerCase().includes(lowercaseQuery),
      );
    },
    [configurations],
  );

  const filterConfigurations = useCallback(
    (filters: {
      isActive?: boolean;
      isDefault?: boolean;
      createdBy?: string;
      hasFieldMappings?: boolean;
    }) => {
      return configurations.filter((config) => {
        if (
          filters.isActive !== undefined &&
          config.is_active !== filters.isActive
        ) {
          return false;
        }
        if (
          filters.isDefault !== undefined &&
          config.is_default !== filters.isDefault
        ) {
          return false;
        }
        if (filters.createdBy && config.created_by !== filters.createdBy) {
          return false;
        }
        if (filters.hasFieldMappings !== undefined) {
          const hasFieldMappings = (config.field_mappings?.length || 0) > 0;
          if (hasFieldMappings !== filters.hasFieldMappings) {
            return false;
          }
        }
        return true;
      });
    },
    [configurations],
  );

  const sortConfigurations = useCallback(
    (
      configs: MappingConfiguration[],
      sortBy: "name" | "created_at" | "updated_at" | "created_by",
      order: "asc" | "desc" = "asc",
    ) => {
      return [...configs].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortBy) {
          case "name":
            aValue = a.config_name.toLowerCase();
            bValue = b.config_name.toLowerCase();
            break;
          case "created_at":
            aValue = new Date(a.created_at || 0).getTime();
            bValue = new Date(b.created_at || 0).getTime();
            break;
          case "updated_at":
            aValue = new Date(a.updated_at || 0).getTime();
            bValue = new Date(b.updated_at || 0).getTime();
            break;
          case "created_by":
            aValue = a.created_by.toLowerCase();
            bValue = b.created_by.toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return order === "asc" ? -1 : 1;
        if (aValue > bValue) return order === "asc" ? 1 : -1;
        return 0;
      });
    },
    [],
  );

  return {
    searchConfigurations,
    filterConfigurations,
    sortConfigurations,
  };
};

// ===== UTILITY HOOKS =====

/**
 * Hook for configuration statistics
 * Provides statistical information about configurations
 */
export const useConfigStats = () => {
  const { configurations } = useMappingConfig();

  const stats = useMemo(() => {
    const total = configurations.length;
    const active = configurations.filter((c) => c.is_active).length;
    const inactive = total - active;
    const hasDefault = configurations.some((c) => c.is_default);
    const withFieldMappings = configurations.filter(
      (c) => (c.field_mappings?.length || 0) > 0,
    ).length;

    const creators = [...new Set(configurations.map((c) => c.created_by))];
    const avgFieldMappings =
      total > 0
        ? Math.round(
            configurations.reduce(
              (sum, c) => sum + (c.field_mappings?.length || 0),
              0,
            ) / total,
          )
        : 0;

    return {
      total,
      active,
      inactive,
      hasDefault,
      withFieldMappings,
      withoutFieldMappings: total - withFieldMappings,
      uniqueCreators: creators.length,
      creators,
      avgFieldMappings,
    };
  }, [configurations]);

  return stats;
};

/**
 * Hook for configuration export/import utilities
 * Provides utilities for exporting and importing configurations
 */
export const useConfigExportImport = () => {
  const { configurations, saveConfiguration } = useMappingConfig();

  const exportConfiguration = useCallback(
    (configId: number) => {
      const config = configurations.find((c) => c.id === configId);
      if (!config) {
        throw new Error("Configuration không tồn tại");
      }

      const exportData = {
        config_name: config.config_name,
        description: config.description,
        field_mappings: config.field_mappings,
        exported_at: new Date().toISOString(),
        exported_from: "MAY HÒA THỌ ĐIỆN BÀN",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mapping-config-${config.config_name}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [configurations],
  );

  const importConfiguration = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate import data
        if (!importData.config_name || !importData.field_mappings) {
          throw new Error("File import không hợp lệ");
        }

        // Create new configuration
        const newConfig: Omit<MappingConfiguration, "id"> = {
          config_name: `${importData.config_name} (Imported)`,
          description: importData.description || "Imported configuration",
          field_mappings: importData.field_mappings,
          is_default: false,
          is_active: true,
          created_by: "admin", // Will be set by API
        };

        return await saveConfiguration(newConfig);
      } catch (error) {
        throw new Error(
          `Lỗi import configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    [saveConfiguration],
  );

  return {
    exportConfiguration,
    importConfiguration,
  };
};
