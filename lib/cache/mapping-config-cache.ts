/**
 * Advanced Caching Strategy for Mapping Configurations
 * Implements multi-layer caching with invalidation logic and optimistic updates
 */

import type {
  MappingConfiguration,
  FieldMapping,
} from "@/lib/column-alias-config";

// ===== CACHE INTERFACES =====

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  version: number;
  etag?: string;
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  enableOptimistic: boolean;
  enablePersistence: boolean;
  storageKey: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  lastCleanup: number;
}

export interface InvalidationRule {
  pattern: string | RegExp;
  dependencies: string[];
  cascade: boolean;
}

// ===== CACHE IMPLEMENTATION =====

export class MappingConfigCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    lastCleanup: 0,
  };
  private invalidationRules: InvalidationRule[] = [];
  private optimisticUpdates = new Map<string, unknown>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      enableOptimistic: true,
      enablePersistence: true,
      storageKey: "mapping-config-cache",
      ...config,
    };

    this.setupInvalidationRules();
    this.loadFromStorage();
    this.scheduleCleanup();
  }

  // ===== CORE CACHE OPERATIONS =====

  get<T>(key: string): T | null {
    // Check optimistic updates first
    if (this.config.enableOptimistic && this.optimisticUpdates.has(key)) {
      this.stats.hits++;
      this.updateHitRate();
      return this.optimisticUpdates.get(key);
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = ttl || this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry,
      version: this.generateVersion(),
      etag: this.generateETag(data),
    };

    // Enforce max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;

    // Clear optimistic update if exists
    if (this.optimisticUpdates.has(key)) {
      this.optimisticUpdates.delete(key);
    }

    this.saveToStorage();
    this.triggerInvalidation(key);
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.optimisticUpdates.delete(key);
    this.stats.size = this.cache.size;

    if (deleted) {
      this.saveToStorage();
      this.triggerInvalidation(key);
    }

    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.optimisticUpdates.clear();
    this.stats.size = 0;
    this.saveToStorage();
  }

  // ===== OPTIMISTIC UPDATES =====

  setOptimistic<T>(key: string, data: T): void {
    if (!this.config.enableOptimistic) return;

    this.optimisticUpdates.set(key, data);

    // Auto-clear optimistic update after a timeout
    setTimeout(() => {
      this.optimisticUpdates.delete(key);
    }, 30000); // 30 seconds
  }

  clearOptimistic(key: string): void {
    this.optimisticUpdates.delete(key);
  }

  hasOptimistic(key: string): boolean {
    return this.optimisticUpdates.has(key);
  }

  // ===== INVALIDATION LOGIC =====

  invalidate(pattern: string | RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.optimisticUpdates.delete(key);
    });

    this.stats.size = this.cache.size;
    this.saveToStorage();
  }

  invalidateByDependency(dependency: string): void {
    const rulesToApply = this.invalidationRules.filter((rule) =>
      rule.dependencies.includes(dependency),
    );

    rulesToApply.forEach((rule) => {
      this.invalidate(rule.pattern);

      if (rule.cascade) {
        // Trigger cascading invalidation
        rule.dependencies.forEach((dep) => {
          if (dep !== dependency) {
            this.invalidateByDependency(dep);
          }
        });
      }
    });
  }

  addInvalidationRule(rule: InvalidationRule): void {
    this.invalidationRules.push(rule);
  }

  // ===== CACHE MANAGEMENT =====

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    this.stats.size = this.cache.size;
    this.stats.lastCleanup = now;

    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getSize(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    if (this.optimisticUpdates.has(key)) return true;

    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  keys(): string[] {
    const cacheKeys = Array.from(this.cache.keys()).filter((key) => {
      const entry = this.cache.get(key);
      return entry && !this.isExpired(entry);
    });

    const optimisticKeys = Array.from(this.optimisticUpdates.keys());

    return [...new Set([...cacheKeys, ...optimisticKeys])];
  }

  // ===== PERSISTENCE =====

  private saveToStorage(): void {
    if (!this.config.enablePersistence) return;

    // Check if we're in browser environment
    if (typeof window === "undefined" || typeof localStorage === "undefined")
      return;

    try {
      const serializable = {
        cache: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now(),
      };

      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(serializable),
      );
    } catch (error) {
      console.warn("Failed to save cache to storage:", error);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.enablePersistence) return;

    // Check if we're in browser environment
    if (typeof window === "undefined" || typeof localStorage === "undefined")
      return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);

      // Restore cache entries (only non-expired ones)
      const now = Date.now();
      data.cache.forEach(([key, entry]: [string, CacheEntry<unknown>]) => {
        if (now - entry.timestamp < entry.expiry) {
          this.cache.set(key, entry);
        }
      });

      // Restore stats
      this.stats = { ...this.stats, ...data.stats };
      this.stats.size = this.cache.size;
    } catch (error) {
      console.warn("Failed to load cache from storage:", error);
    }
  }

  // ===== UTILITY METHODS =====

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.expiry;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private generateVersion(): number {
    return Date.now();
  }

  private generateETag(data: unknown): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private matchesPattern(key: string, pattern: string | RegExp): boolean {
    if (typeof pattern === "string") {
      return key.includes(pattern);
    }
    return pattern.test(key);
  }

  private triggerInvalidation(key: string): void {
    // Find rules that should be triggered by this key
    const rulesToApply = this.invalidationRules.filter((rule) => {
      if (typeof rule.pattern === "string") {
        return key.includes(rule.pattern);
      }
      return rule.pattern.test(key);
    });

    rulesToApply.forEach((rule) => {
      rule.dependencies.forEach((dependency) => {
        this.invalidateByDependency(dependency);
      });
    });
  }

  private setupInvalidationRules(): void {
    // Configuration list invalidation
    this.addInvalidationRule({
      pattern: /^config:/,
      dependencies: ["configurations", "default-config"],
      cascade: true,
    });

    // Default configuration invalidation
    this.addInvalidationRule({
      pattern: "default-config",
      dependencies: ["configurations"],
      cascade: false,
    });

    // Field mappings invalidation
    this.addInvalidationRule({
      pattern: /field-mappings:/,
      dependencies: ["configurations"],
      cascade: true,
    });
  }

  private scheduleCleanup(): void {
    // Run cleanup every 10 minutes
    setInterval(
      () => {
        this.cleanup();
      },
      10 * 60 * 1000,
    );
  }
}

// ===== CACHE INSTANCE =====

export const mappingConfigCache = new MappingConfigCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  enableOptimistic: true,
  enablePersistence: true,
  storageKey: "mapping-config-cache-v1",
});

// ===== CACHE KEYS =====

export const CacheKeys = {
  CONFIGURATIONS: "configurations",
  DEFAULT_CONFIG: "default-config",
  CONFIG_BY_ID: (id: number) => `config:${id}`,
  CONFIG_BY_NAME: (name: string) => `config:name:${name}`,
  FIELD_MAPPINGS: (configId: number) => `field-mappings:${configId}`,
  USER_CONFIGS: (userId: string) => `user-configs:${userId}`,
  ACTIVE_CONFIGS: "active-configs",
  CONFIG_STATS: "config-stats",
} as const;

// ===== CACHE UTILITIES =====

export const cacheUtils = {
  // Configuration caching
  cacheConfiguration: (config: MappingConfiguration) => {
    mappingConfigCache.set(CacheKeys.CONFIG_BY_ID(config.id!), config);
    mappingConfigCache.set(
      CacheKeys.CONFIG_BY_NAME(config.config_name),
      config,
    );

    if (config.field_mappings) {
      mappingConfigCache.set(
        CacheKeys.FIELD_MAPPINGS(config.id!),
        config.field_mappings,
      );
    }
  },

  // Optimistic configuration update
  optimisticConfigUpdate: (
    id: number,
    updates: Partial<MappingConfiguration>,
  ) => {
    const existing = mappingConfigCache.get<MappingConfiguration>(
      CacheKeys.CONFIG_BY_ID(id),
    );
    if (existing) {
      const updated = { ...existing, ...updates };
      mappingConfigCache.setOptimistic(CacheKeys.CONFIG_BY_ID(id), updated);
    }
  },

  // Invalidate configuration caches
  invalidateConfiguration: (id: number) => {
    mappingConfigCache.delete(CacheKeys.CONFIG_BY_ID(id));
    mappingConfigCache.invalidate(/^config:/);
    mappingConfigCache.invalidateByDependency("configurations");
  },

  // Invalidate all configuration caches
  invalidateAllConfigurations: () => {
    mappingConfigCache.invalidate(/^config/);
    mappingConfigCache.delete(CacheKeys.CONFIGURATIONS);
    mappingConfigCache.delete(CacheKeys.DEFAULT_CONFIG);
    mappingConfigCache.delete(CacheKeys.ACTIVE_CONFIGS);
  },

  // Cache configuration list
  cacheConfigurationList: (configs: MappingConfiguration[]) => {
    mappingConfigCache.set(CacheKeys.CONFIGURATIONS, configs);

    // Cache individual configs
    configs.forEach((config) => {
      cacheUtils.cacheConfiguration(config);
    });

    // Cache default config
    const defaultConfig = configs.find((c) => c.is_default);
    if (defaultConfig) {
      mappingConfigCache.set(CacheKeys.DEFAULT_CONFIG, defaultConfig);
    }

    // Cache active configs
    const activeConfigs = configs.filter((c) => c.is_active);
    mappingConfigCache.set(CacheKeys.ACTIVE_CONFIGS, activeConfigs);
  },

  // Get cached configuration
  getCachedConfiguration: (id: number): MappingConfiguration | null => {
    return mappingConfigCache.get<MappingConfiguration>(
      CacheKeys.CONFIG_BY_ID(id),
    );
  },

  // Get cached configuration by name
  getCachedConfigurationByName: (name: string): MappingConfiguration | null => {
    return mappingConfigCache.get<MappingConfiguration>(
      CacheKeys.CONFIG_BY_NAME(name),
    );
  },

  // Get cached configuration list
  getCachedConfigurationList: (): MappingConfiguration[] | null => {
    return mappingConfigCache.get<MappingConfiguration[]>(
      CacheKeys.CONFIGURATIONS,
    );
  },

  // Get cached default configuration
  getCachedDefaultConfiguration: (): MappingConfiguration | null => {
    return mappingConfigCache.get<MappingConfiguration>(
      CacheKeys.DEFAULT_CONFIG,
    );
  },

  // Check if configuration is cached
  isConfigurationCached: (id: number): boolean => {
    return mappingConfigCache.has(CacheKeys.CONFIG_BY_ID(id));
  },

  // Get cache statistics
  getCacheStats: () => {
    return mappingConfigCache.getStats();
  },

  // Clear all caches
  clearAllCaches: () => {
    mappingConfigCache.clear();
  },
};

// ===== CACHE HOOKS INTEGRATION =====

export const useCacheIntegration = () => {
  const stats = mappingConfigCache.getStats();

  return {
    cacheStats: stats,
    clearCache: cacheUtils.clearAllCaches,
    invalidateAll: cacheUtils.invalidateAllConfigurations,
    cacheSize: mappingConfigCache.getSize(),
    cacheKeys: mappingConfigCache.keys(),
  };
};
