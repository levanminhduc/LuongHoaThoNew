interface CacheData<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface DashboardCacheOptions {
  expireTimeMs?: number;
}

type DataType =
  | "departments"
  | "signature-status"
  | "signature-history"
  | "trends"
  | "payroll"
  | "stats";

class DashboardCache {
  private static readonly DEFAULT_EXPIRE_TIME = 5 * 60 * 1000;
  private static readonly CACHE_PREFIX = "dashboard_cache_";

  private static generateCacheKey(
    role: string,
    month: string,
    dataType: DataType,
  ): string {
    return `${this.CACHE_PREFIX}${role}_${month}_${dataType}`;
  }

  static setCacheData<T>(
    role: string,
    month: string,
    dataType: DataType,
    data: T,
    options: DashboardCacheOptions = {},
  ): void {
    try {
      const expireTimeMs = options.expireTimeMs || this.DEFAULT_EXPIRE_TIME;
      const now = Date.now();

      const cacheData: CacheData<T> = {
        data,
        timestamp: now,
        expiresAt: now + expireTimeMs,
      };

      const cacheKey = this.generateCacheKey(role, month, dataType);
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      console.log(`[DashboardCache] Cached ${dataType} for ${role}/${month}`);
    } catch (error) {
      console.error("[DashboardCache] Failed to set cache:", error);
    }
  }

  static getCacheData<T>(
    role: string,
    month: string,
    dataType: DataType,
  ): T | null {
    try {
      const cacheKey = this.generateCacheKey(role, month, dataType);
      const cachedItem = localStorage.getItem(cacheKey);

      if (!cachedItem) {
        console.log(`[DashboardCache] Cache miss: ${role}/${month}/${dataType}`);
        return null;
      }

      const cacheData: CacheData<T> = JSON.parse(cachedItem);
      const now = Date.now();

      if (now > cacheData.expiresAt) {
        console.log(`[DashboardCache] Cache expired: ${role}/${month}/${dataType}`);
        localStorage.removeItem(cacheKey);
        return null;
      }

      const remainingMs = cacheData.expiresAt - now;
      console.log(
        `[DashboardCache] Cache hit: ${role}/${month}/${dataType} (${Math.round(remainingMs / 1000)}s remaining)`,
      );

      return cacheData.data;
    } catch (error) {
      console.error("[DashboardCache] Failed to get cache:", error);
      return null;
    }
  }

  static isCacheValid(role: string, month: string, dataType: DataType): boolean {
    try {
      const cacheKey = this.generateCacheKey(role, month, dataType);
      const cachedItem = localStorage.getItem(cacheKey);

      if (!cachedItem) return false;

      const cacheData: CacheData = JSON.parse(cachedItem);
      return Date.now() <= cacheData.expiresAt;
    } catch {
      return false;
    }
  }

  static clearCache(role: string, month: string, dataType: DataType): void {
    try {
      const cacheKey = this.generateCacheKey(role, month, dataType);
      localStorage.removeItem(cacheKey);
      console.log(`[DashboardCache] Cleared: ${role}/${month}/${dataType}`);
    } catch (error) {
      console.error("[DashboardCache] Failed to clear cache:", error);
    }
  }

  static clearAllDashboardCache(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      cacheKeys.forEach((key) => localStorage.removeItem(key));
      console.log(`[DashboardCache] Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      console.error("[DashboardCache] Failed to clear all cache:", error);
    }
  }

  static clearRoleCache(role: string): void {
    try {
      const keys = Object.keys(localStorage);
      const rolePrefix = `${this.CACHE_PREFIX}${role}_`;
      const cacheKeys = keys.filter((key) => key.startsWith(rolePrefix));

      cacheKeys.forEach((key) => localStorage.removeItem(key));
      console.log(`[DashboardCache] Cleared ${cacheKeys.length} entries for ${role}`);
    } catch (error) {
      console.error("[DashboardCache] Failed to clear role cache:", error);
    }
  }
}

export default DashboardCache;

export const {
  setCacheData,
  getCacheData,
  isCacheValid,
  clearCache,
  clearAllDashboardCache,
  clearRoleCache,
} = DashboardCache;

