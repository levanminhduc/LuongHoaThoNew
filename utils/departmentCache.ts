// Department Data Cache Utility
// Provides caching functionality for department API calls with 12-hour expiration

interface CacheData {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface DepartmentCacheOptions {
  expireTimeMs?: number; // Default: 12 hours
}

class DepartmentCache {
  private static readonly DEFAULT_EXPIRE_TIME = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  private static readonly CACHE_PREFIX = "department_cache_";

  /**
   * Generate cache key for department data
   */
  private static generateCacheKey(
    departmentName: string,
    month: string,
  ): string {
    return `${this.CACHE_PREFIX}${departmentName}_${month}`;
  }

  /**
   * Set data to cache with expiration time
   */
  static setCacheData(
    departmentName: string,
    month: string,
    data: any,
    options: DepartmentCacheOptions = {},
  ): void {
    try {
      const expireTimeMs = options.expireTimeMs || this.DEFAULT_EXPIRE_TIME;
      const now = Date.now();

      const cacheData: CacheData = {
        data,
        timestamp: now,
        expiresAt: now + expireTimeMs,
      };

      const cacheKey = this.generateCacheKey(departmentName, month);
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      console.log(
        `[DepartmentCache] Data cached for ${departmentName} - ${month}`,
        {
          cacheKey,
          expiresAt: new Date(cacheData.expiresAt).toLocaleString("vi-VN"),
          dataSize: JSON.stringify(data).length,
        },
      );
    } catch (error) {
      console.error("[DepartmentCache] Failed to set cache data:", error);
    }
  }

  /**
   * Get data from cache if valid
   */
  static getCacheData(departmentName: string, month: string): any | null {
    try {
      const cacheKey = this.generateCacheKey(departmentName, month);
      const cachedItem = localStorage.getItem(cacheKey);

      if (!cachedItem) {
        console.log(
          `[DepartmentCache] No cache found for ${departmentName} - ${month}`,
        );
        return null;
      }

      const cacheData: CacheData = JSON.parse(cachedItem);
      const now = Date.now();

      // Check if cache is still valid
      if (now > cacheData.expiresAt) {
        console.log(
          `[DepartmentCache] Cache expired for ${departmentName} - ${month}`,
          {
            expiredAt: new Date(cacheData.expiresAt).toLocaleString("vi-VN"),
            now: new Date(now).toLocaleString("vi-VN"),
          },
        );

        // Remove expired cache
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(
        `[DepartmentCache] Cache hit for ${departmentName} - ${month}`,
        {
          cachedAt: new Date(cacheData.timestamp).toLocaleString("vi-VN"),
          expiresAt: new Date(cacheData.expiresAt).toLocaleString("vi-VN"),
          remainingTime:
            Math.round((cacheData.expiresAt - now) / (1000 * 60)) + " minutes",
        },
      );

      return cacheData.data;
    } catch (error) {
      console.error("[DepartmentCache] Failed to get cache data:", error);
      return null;
    }
  }

  /**
   * Check if cache is valid for given department and month
   */
  static isCacheValid(departmentName: string, month: string): boolean {
    try {
      const cacheKey = this.generateCacheKey(departmentName, month);
      const cachedItem = localStorage.getItem(cacheKey);

      if (!cachedItem) {
        return false;
      }

      const cacheData: CacheData = JSON.parse(cachedItem);
      const now = Date.now();

      return now <= cacheData.expiresAt;
    } catch (error) {
      console.error("[DepartmentCache] Failed to check cache validity:", error);
      return false;
    }
  }

  /**
   * Clear cache for specific department and month
   */
  static clearCache(departmentName: string, month: string): void {
    try {
      const cacheKey = this.generateCacheKey(departmentName, month);
      localStorage.removeItem(cacheKey);

      console.log(
        `[DepartmentCache] Cache cleared for ${departmentName} - ${month}`,
      );
    } catch (error) {
      console.error("[DepartmentCache] Failed to clear cache:", error);
    }
  }

  /**
   * Clear all department caches
   */
  static clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage);
      const departmentCacheKeys = keys.filter((key) =>
        key.startsWith(this.CACHE_PREFIX),
      );

      departmentCacheKeys.forEach((key) => {
        localStorage.removeItem(key);
      });

      console.log(
        `[DepartmentCache] Cleared ${departmentCacheKeys.length} cache entries`,
      );
    } catch (error) {
      console.error("[DepartmentCache] Failed to clear all cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    totalCaches: number;
    cacheKeys: string[];
    totalSize: number;
  } {
    try {
      const keys = Object.keys(localStorage);
      const departmentCacheKeys = keys.filter((key) =>
        key.startsWith(this.CACHE_PREFIX),
      );

      let totalSize = 0;
      departmentCacheKeys.forEach((key) => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      });

      return {
        totalCaches: departmentCacheKeys.length,
        cacheKeys: departmentCacheKeys,
        totalSize,
      };
    } catch (error) {
      console.error("[DepartmentCache] Failed to get cache stats:", error);
      return {
        totalCaches: 0,
        cacheKeys: [],
        totalSize: 0,
      };
    }
  }

  /**
   * Force refresh - clear cache and return null to trigger API call
   */
  static forceRefresh(departmentName: string, month: string): null {
    this.clearCache(departmentName, month);
    console.log(
      `[DepartmentCache] Force refresh triggered for ${departmentName} - ${month}`,
    );
    return null;
  }
}

export default DepartmentCache;

// Export individual functions for convenience
export const {
  setCacheData,
  getCacheData,
  isCacheValid,
  clearCache,
  clearAllCache,
  getCacheStats,
  forceRefresh,
} = DepartmentCache;
