/**
 * Real-time Sync Mechanism for Mapping Configurations
 * Implements subscription pattern để sync state changes across components
 * và detect external config changes
 */

import { useMappingConfigStore } from "@/lib/stores/mapping-config-store";
import { cacheUtils } from "@/lib/cache/mapping-config-cache";
import type { MappingConfiguration } from "@/lib/column-alias-config";

// ===== SYNC INTERFACES =====

export interface SyncEvent {
  type:
    | "config_created"
    | "config_updated"
    | "config_deleted"
    | "default_changed"
    | "cache_invalidated";
  configId?: number;
  data?: any;
  timestamp: number;
  source: "local" | "external" | "api";
}

export interface SyncSubscription {
  id: string;
  callback: (event: SyncEvent) => void;
  filter?: (event: SyncEvent) => boolean;
}

export interface SyncOptions {
  enablePolling: boolean;
  pollingInterval: number;
  enableBroadcastChannel: boolean;
  enableStorageEvents: boolean;
  enableVisibilitySync: boolean;
}

// ===== SYNC MANAGER =====

class MappingConfigSyncManager {
  private subscriptions = new Map<string, SyncSubscription>();
  private broadcastChannel: BroadcastChannel | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamp = 0;
  private isPolling = false;
  private options: SyncOptions;

  constructor(options: Partial<SyncOptions> = {}) {
    this.options = {
      enablePolling: true,
      pollingInterval: 30000, // 30 seconds
      enableBroadcastChannel: true,
      enableStorageEvents: true,
      enableVisibilitySync: true,
      ...options,
    };

    this.initialize();
  }

  // ===== INITIALIZATION =====

  private initialize(): void {
    if (typeof window === "undefined") return;

    // Setup BroadcastChannel for cross-tab communication
    if (this.options.enableBroadcastChannel && "BroadcastChannel" in window) {
      this.setupBroadcastChannel();
    }

    // Setup storage events for cross-tab sync
    if (this.options.enableStorageEvents) {
      this.setupStorageEvents();
    }

    // Setup visibility change sync
    if (this.options.enableVisibilitySync) {
      this.setupVisibilitySync();
    }

    // Setup polling for external changes
    if (this.options.enablePolling) {
      this.startPolling();
    }

    // Setup beforeunload cleanup
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  // ===== BROADCAST CHANNEL SETUP =====

  private setupBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel("mapping-config-sync");

      this.broadcastChannel.addEventListener("message", (event) => {
        const syncEvent: SyncEvent = event.data;

        // Don't process our own events
        if (syncEvent.source === "local") return;

        this.handleExternalSyncEvent(syncEvent);
      });
    } catch (error) {
      console.warn("Failed to setup BroadcastChannel:", error);
    }
  }

  // ===== STORAGE EVENTS SETUP =====

  private setupStorageEvents(): void {
    // Check if we're in browser environment
    if (typeof window === "undefined") return;

    window.addEventListener("storage", (event) => {
      if (event.key === "mapping-config-sync-event") {
        try {
          const syncEvent: SyncEvent = JSON.parse(event.newValue || "{}");
          this.handleExternalSyncEvent(syncEvent);
        } catch (error) {
          console.warn("Failed to parse storage sync event:", error);
        }
      }
    });
  }

  // ===== VISIBILITY SYNC SETUP =====

  private setupVisibilitySync(): void {
    // Check if we're in browser environment
    if (typeof window === "undefined" || typeof document === "undefined")
      return;

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // Tab became visible, check for updates
        this.checkForExternalUpdates();
      }
    });

    // Also sync when window gains focus
    window.addEventListener("focus", () => {
      this.checkForExternalUpdates();
    });
  }

  // ===== POLLING SETUP =====

  private startPolling(): void {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollingInterval = setInterval(() => {
      this.checkForExternalUpdates();
    }, this.options.pollingInterval);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  // ===== SUBSCRIPTION MANAGEMENT =====

  subscribe(
    callback: (event: SyncEvent) => void,
    filter?: (event: SyncEvent) => boolean,
  ): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscriptions.set(id, {
      id,
      callback,
      filter,
    });

    return id;
  }

  unsubscribe(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  // ===== EVENT BROADCASTING =====

  broadcast(event: Omit<SyncEvent, "timestamp" | "source">): void {
    const syncEvent: SyncEvent = {
      ...event,
      timestamp: Date.now(),
      source: "local",
    };

    // Broadcast to other tabs via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ ...syncEvent, source: "external" });
      } catch (error) {
        console.warn("Failed to broadcast via BroadcastChannel:", error);
      }
    }

    // Broadcast via localStorage for broader compatibility
    try {
      localStorage.setItem(
        "mapping-config-sync-event",
        JSON.stringify({ ...syncEvent, source: "external" }),
      );
      // Clear immediately to trigger storage event
      localStorage.removeItem("mapping-config-sync-event");
    } catch (error) {
      console.warn("Failed to broadcast via localStorage:", error);
    }

    // Notify local subscribers
    this.notifySubscribers(syncEvent);
  }

  // ===== EVENT HANDLING =====

  private handleExternalSyncEvent(event: SyncEvent): void {
    // Update last sync timestamp
    this.lastSyncTimestamp = Math.max(this.lastSyncTimestamp, event.timestamp);

    // Handle different event types
    switch (event.type) {
      case "config_created":
      case "config_updated":
      case "config_deleted":
      case "default_changed":
        // Invalidate cache and refresh configurations
        cacheUtils.invalidateAllConfigurations();
        this.refreshConfigurations();
        break;

      case "cache_invalidated":
        // Just invalidate cache
        cacheUtils.invalidateAllConfigurations();
        break;
    }

    // Notify subscribers
    this.notifySubscribers(event);
  }

  private notifySubscribers(event: SyncEvent): void {
    for (const subscription of this.subscriptions.values()) {
      try {
        // Apply filter if provided
        if (subscription.filter && !subscription.filter(event)) {
          continue;
        }

        subscription.callback(event);
      } catch (error) {
        console.warn("Error in sync subscription callback:", error);
      }
    }
  }

  // ===== EXTERNAL UPDATES CHECK =====

  private async checkForExternalUpdates(): Promise<void> {
    try {
      // Check if we're in browser environment
      if (typeof window === "undefined" || typeof localStorage === "undefined")
        return;

      // Check if we have admin token
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      // Get current configurations timestamp from API
      const response = await fetch(
        "/api/admin/mapping-configurations?timestamp_only=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();
      const serverTimestamp = data.last_updated || 0;

      // Compare with our last sync timestamp
      if (serverTimestamp > this.lastSyncTimestamp) {
        // External changes detected
        this.broadcast({
          type: "cache_invalidated",
          data: { serverTimestamp },
        });
      }
    } catch (error) {
      console.warn("Failed to check for external updates:", error);
    }
  }

  private async refreshConfigurations(): Promise<void> {
    try {
      const store = useMappingConfigStore.getState();
      await store.refreshConfigurations();
    } catch (error) {
      console.warn("Failed to refresh configurations:", error);
    }
  }

  // ===== CLEANUP =====

  cleanup(): void {
    // Clear subscriptions
    this.subscriptions.clear();

    // Close broadcast channel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Stop polling
    this.stopPolling();
  }

  // ===== UTILITY METHODS =====

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  isConnected(): boolean {
    return this.broadcastChannel !== null || this.isPolling;
  }

  // ===== MANUAL SYNC TRIGGERS =====

  triggerConfigCreated(config: MappingConfiguration): void {
    this.broadcast({
      type: "config_created",
      configId: config.id,
      data: config,
    });
  }

  triggerConfigUpdated(
    configId: number,
    updates: Partial<MappingConfiguration>,
  ): void {
    this.broadcast({
      type: "config_updated",
      configId,
      data: updates,
    });
  }

  triggerConfigDeleted(configId: number): void {
    this.broadcast({
      type: "config_deleted",
      configId,
    });
  }

  triggerDefaultChanged(configId: number): void {
    this.broadcast({
      type: "default_changed",
      configId,
    });
  }

  triggerCacheInvalidated(): void {
    this.broadcast({
      type: "cache_invalidated",
    });
  }
}

// ===== SINGLETON INSTANCE =====

export const syncManager = new MappingConfigSyncManager();

// ===== REACT HOOKS =====

export const useMappingConfigSync = () => {
  const [isConnected, setIsConnected] = React.useState(
    syncManager.isConnected(),
  );
  const [lastSync, setLastSync] = React.useState(
    syncManager.getLastSyncTimestamp(),
  );
  const [subscriptionCount, setSubscriptionCount] = React.useState(
    syncManager.getSubscriptionCount(),
  );

  React.useEffect(() => {
    const updateStatus = () => {
      setIsConnected(syncManager.isConnected());
      setLastSync(syncManager.getLastSyncTimestamp());
      setSubscriptionCount(syncManager.getSubscriptionCount());
    };

    // Subscribe to sync events to update status
    const subscriptionId = syncManager.subscribe(() => {
      updateStatus();
    });

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      syncManager.unsubscribe(subscriptionId);
      clearInterval(interval);
    };
  }, []);

  return {
    isConnected,
    lastSync,
    subscriptionCount,
    triggerConfigCreated: syncManager.triggerConfigCreated.bind(syncManager),
    triggerConfigUpdated: syncManager.triggerConfigUpdated.bind(syncManager),
    triggerConfigDeleted: syncManager.triggerConfigDeleted.bind(syncManager),
    triggerDefaultChanged: syncManager.triggerDefaultChanged.bind(syncManager),
    triggerCacheInvalidated:
      syncManager.triggerCacheInvalidated.bind(syncManager),
  };
};

export const useSyncSubscription = (
  callback: (event: SyncEvent) => void,
  filter?: (event: SyncEvent) => boolean,
  deps: React.DependencyList = [],
) => {
  React.useEffect(() => {
    const subscriptionId = syncManager.subscribe(callback, filter);

    return () => {
      syncManager.unsubscribe(subscriptionId);
    };
  }, deps);
};

// ===== SYNC UTILITIES =====

export const syncUtils = {
  // Subscribe to specific config changes
  subscribeToConfig: (
    configId: number,
    callback: (event: SyncEvent) => void,
  ) => {
    return syncManager.subscribe(
      callback,
      (event) => event.configId === configId,
    );
  },

  // Subscribe to default config changes
  subscribeToDefaultChanges: (callback: (event: SyncEvent) => void) => {
    return syncManager.subscribe(
      callback,
      (event) => event.type === "default_changed",
    );
  },

  // Subscribe to all config changes
  subscribeToAllChanges: (callback: (event: SyncEvent) => void) => {
    return syncManager.subscribe(callback, (event) =>
      ["config_created", "config_updated", "config_deleted"].includes(
        event.type,
      ),
    );
  },

  // Manual sync trigger
  triggerManualSync: () => {
    syncManager.triggerCacheInvalidated();
  },

  // Get sync status
  getSyncStatus: () => ({
    isConnected: syncManager.isConnected(),
    lastSync: syncManager.getLastSyncTimestamp(),
    subscriptionCount: syncManager.getSubscriptionCount(),
  }),
};

// ===== REACT IMPORT =====
import React from "react";
