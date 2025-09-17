/**
 * Mapping Configuration Store - Zustand State Management
 * Quản lý state cho mapping configurations với caching và real-time sync
 * Sử dụng patterns từ TanStack Query Firebase
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { MappingConfiguration, FieldMapping } from '@/lib/column-alias-config'
import { cacheUtils, CacheKeys, mappingConfigCache } from '@/lib/cache/mapping-config-cache'
import { syncManager } from '@/lib/sync/mapping-config-sync'

// ===== INTERFACES =====

export interface ConfigNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  configId?: number
  timestamp: number
  read: boolean
}

export interface MappingConfigState {
  // State
  configurations: MappingConfiguration[]
  defaultConfig: MappingConfiguration | null
  currentConfig: MappingConfiguration | null
  isLoading: boolean
  isLoadingDefault: boolean
  isSaving: boolean
  error: string | null
  lastUpdated: number | null
  
  // Notifications
  notifications: ConfigNotification[]
  unreadCount: number
  
  // Cache metadata
  cacheTimestamp: number | null
  cacheExpiry: number // 5 minutes default
}

export interface MappingConfigActions {
  // Configuration Management
  loadConfigurations: () => Promise<void>
  loadDefaultConfiguration: () => Promise<void>
  saveConfiguration: (config: Omit<MappingConfiguration, 'id'>) => Promise<MappingConfiguration>
  updateConfiguration: (id: number, updates: Partial<MappingConfiguration>) => Promise<void>
  deleteConfiguration: (id: number) => Promise<void>
  setDefaultConfiguration: (id: number) => Promise<void>
  
  // Current Config Management
  setCurrentConfig: (config: MappingConfiguration | null) => void
  applyConfiguration: (id: number) => Promise<void>
  clearCurrentConfig: () => void
  
  // Notifications
  addNotification: (notification: Omit<ConfigNotification, 'id' | 'timestamp'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  clearAllNotifications: () => void
  
  // Cache Management
  invalidateCache: () => void
  refreshConfigurations: () => Promise<void>
  
  // Utility Actions
  clearError: () => void
  reset: () => void
}

type MappingConfigStore = MappingConfigState & MappingConfigActions

// ===== INITIAL STATE =====

const initialState: MappingConfigState = {
  configurations: [],
  defaultConfig: null,
  currentConfig: null,
  isLoading: false,
  isLoadingDefault: false,
  isSaving: false,
  error: null,
  lastUpdated: null,
  notifications: [],
  unreadCount: 0,
  cacheTimestamp: null,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
}

// ===== UTILITY FUNCTIONS =====

const generateNotificationId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const isValidToken = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false
  const token = localStorage.getItem('admin_token')
  return !!token
}

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { 'Content-Type': 'application/json' }
  }
  const token = localStorage.getItem('admin_token')
  if (!token) {
    return { 'Content-Type': 'application/json' }
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

const isCacheValid = (timestamp: number | null, expiry: number) => {
  if (!timestamp) return false
  return Date.now() - timestamp < expiry
}

// ===== API FUNCTIONS =====

const apiLoadConfigurations = async (): Promise<MappingConfiguration[]> => {
  if (!isValidToken()) {
    throw new Error('Không có quyền truy cập')
  }

  const response = await fetch('/api/admin/mapping-configurations', {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Lỗi khi tải configurations')
  }

  const data = await response.json()
  return data.data || []
}

const apiSaveConfiguration = async (config: Omit<MappingConfiguration, 'id'>): Promise<MappingConfiguration> => {
  if (!isValidToken()) {
    throw new Error('Không có quyền truy cập')
  }

  const response = await fetch('/api/admin/mapping-configurations', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Lỗi khi lưu configuration')
  }

  const data = await response.json()
  return data.data
}

const apiUpdateConfiguration = async (id: number, updates: Partial<MappingConfiguration>): Promise<void> => {
  if (!isValidToken()) {
    throw new Error('Không có quyền truy cập')
  }

  const response = await fetch(`/api/admin/mapping-configurations/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Lỗi khi cập nhật configuration')
  }
}

const apiDeleteConfiguration = async (id: number): Promise<void> => {
  if (!isValidToken()) {
    throw new Error('Không có quyền truy cập')
  }

  const response = await fetch(`/api/admin/mapping-configurations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Lỗi khi xóa configuration')
  }
}

// ===== ZUSTAND STORE =====

export const useMappingConfigStore = create<MappingConfigStore>()(
  devtools(
    immer((set, get) => ({
        ...initialState,

        // ===== CONFIGURATION MANAGEMENT =====
        
        loadConfigurations: async () => {
          const state = get()

          // Try to get from cache first
          const cachedConfigs = cacheUtils.getCachedConfigurationList()
          if (cachedConfigs && isCacheValid(state.cacheTimestamp, state.cacheExpiry)) {
            set((state) => {
              state.configurations = cachedConfigs
              state.defaultConfig = cachedConfigs.find(c => c.is_default) || null
              state.isLoading = false
            })
            return
          }

          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            const configurations = await apiLoadConfigurations()

            // Cache the configurations
            cacheUtils.cacheConfigurationList(configurations)

            set((state) => {
              state.configurations = configurations
              state.defaultConfig = configurations.find(c => c.is_default) || null
              state.isLoading = false
              state.lastUpdated = Date.now()
              state.cacheTimestamp = Date.now()
            })

            get().addNotification({
              type: 'success',
              title: 'Configurations Loaded',
              message: `Đã tải ${configurations.length} mapping configurations`,
              read: false
            })

          } catch (error) {
            set((state) => {
              state.isLoading = false
              state.error = error instanceof Error ? error.message : 'Lỗi không xác định'
            })

            get().addNotification({
              type: 'error',
              title: 'Load Failed',
              message: error instanceof Error ? error.message : 'Lỗi khi tải configurations',
              read: false
            })
          }
        },

        loadDefaultConfiguration: async () => {
          set((state) => {
            state.isLoadingDefault = true
            state.error = null
          })

          try {
            // Load all configs if not loaded yet
            await get().loadConfigurations()
            
            const defaultConfig = get().configurations.find(c => c.is_default) || null
            
            set((state) => {
              state.defaultConfig = defaultConfig
              state.isLoadingDefault = false
            })

          } catch (error) {
            set((state) => {
              state.isLoadingDefault = false
              state.error = error instanceof Error ? error.message : 'Lỗi không xác định'
            })
          }
        },

        saveConfiguration: async (config) => {
          set((state) => {
            state.isSaving = true
            state.error = null
          })

          try {
            // Optimistic update
            const tempConfig = { ...config, id: Date.now() } as MappingConfiguration
            cacheUtils.optimisticConfigUpdate(tempConfig.id!, config)

            const savedConfig = await apiSaveConfiguration(config)

            // Cache the saved configuration
            cacheUtils.cacheConfiguration(savedConfig)

            set((state) => {
              state.configurations.push(savedConfig)
              state.isSaving = false
              state.lastUpdated = Date.now()
              state.cacheTimestamp = Date.now()

              // Update default if this is set as default
              if (savedConfig.is_default) {
                // Unset other defaults
                state.configurations.forEach(c => {
                  if (c.id !== savedConfig.id) c.is_default = false
                })
                state.defaultConfig = savedConfig
                // Cache default config
                mappingConfigCache.set(CacheKeys.DEFAULT_CONFIG, savedConfig)
              }
            })

            get().addNotification({
              type: 'success',
              title: 'Configuration Saved',
              message: `Configuration "${savedConfig.config_name}" đã được lưu thành công`,
              configId: savedConfig.id,
              read: false
            })

            // Trigger sync event
            syncManager.triggerConfigCreated(savedConfig)

            return savedConfig

          } catch (error) {
            // Clear optimistic update on error
            mappingConfigCache.clearOptimistic(CacheKeys.CONFIG_BY_ID(Date.now()))

            set((state) => {
              state.isSaving = false
              state.error = error instanceof Error ? error.message : 'Lỗi không xác định'
            })

            get().addNotification({
              type: 'error',
              title: 'Save Failed',
              message: error instanceof Error ? error.message : 'Lỗi khi lưu configuration',
              read: false
            })

            throw error
          }
        },

        updateConfiguration: async (id, updates) => {
          set((state) => {
            state.isSaving = true
            state.error = null
          })

          try {
            // Optimistic update
            cacheUtils.optimisticConfigUpdate(id, updates)

            await apiUpdateConfiguration(id, updates)

            set((state) => {
              const configIndex = state.configurations.findIndex(c => c.id === id)
              if (configIndex !== -1) {
                const updatedConfig = { ...state.configurations[configIndex], ...updates }
                state.configurations[configIndex] = updatedConfig

                // Cache the updated configuration
                cacheUtils.cacheConfiguration(updatedConfig)

                // Update default if changed
                if (updates.is_default) {
                  // Unset other defaults
                  state.configurations.forEach(c => {
                    if (c.id !== id) c.is_default = false
                  })
                  state.defaultConfig = updatedConfig
                  // Cache default config
                  mappingConfigCache.set(CacheKeys.DEFAULT_CONFIG, updatedConfig)
                }
              }
              state.isSaving = false
              state.lastUpdated = Date.now()
              state.cacheTimestamp = Date.now()
            })

            get().addNotification({
              type: 'success',
              title: 'Configuration Updated',
              message: 'Configuration đã được cập nhật thành công',
              configId: id,
              read: false
            })

            // Trigger sync event
            syncManager.triggerConfigUpdated(id, updates)

          } catch (error) {
            // Clear optimistic update on error
            mappingConfigCache.clearOptimistic(CacheKeys.CONFIG_BY_ID(id))

            set((state) => {
              state.isSaving = false
              state.error = error instanceof Error ? error.message : 'Lỗi không xác định'
            })

            get().addNotification({
              type: 'error',
              title: 'Update Failed',
              message: error instanceof Error ? error.message : 'Lỗi khi cập nhật configuration',
              read: false
            })

            throw error
          }
        },

        deleteConfiguration: async (id) => {
          set((state) => {
            state.isSaving = true
            state.error = null
          })

          try {
            await apiDeleteConfiguration(id)

            // Invalidate cache for this configuration
            cacheUtils.invalidateConfiguration(id)

            set((state) => {
              const configToDelete = state.configurations.find(c => c.id === id)
              state.configurations = state.configurations.filter(c => c.id !== id)

              // Clear default if deleted config was default
              if (state.defaultConfig?.id === id) {
                state.defaultConfig = null
                mappingConfigCache.delete(CacheKeys.DEFAULT_CONFIG)
              }

              // Clear current if deleted config was current
              if (state.currentConfig?.id === id) {
                state.currentConfig = null
              }

              state.isSaving = false
              state.lastUpdated = Date.now()
              state.cacheTimestamp = Date.now()
            })

            get().addNotification({
              type: 'success',
              title: 'Configuration Deleted',
              message: 'Configuration đã được xóa thành công',
              read: false
            })

            // Trigger sync event
            syncManager.triggerConfigDeleted(id)

          } catch (error) {
            set((state) => {
              state.isSaving = false
              state.error = error instanceof Error ? error.message : 'Lỗi không xác định'
            })

            get().addNotification({
              type: 'error',
              title: 'Delete Failed',
              message: error instanceof Error ? error.message : 'Lỗi khi xóa configuration',
              read: false
            })

            throw error
          }
        },

        setDefaultConfiguration: async (id) => {
          try {
            await get().updateConfiguration(id, { is_default: true })

            // Trigger sync event for default change
            syncManager.triggerDefaultChanged(id)
          } catch (error) {
            throw error
          }
        },

        // ===== CURRENT CONFIG MANAGEMENT =====

        setCurrentConfig: (config) => {
          set((state) => {
            state.currentConfig = config
          })

          if (config) {
            get().addNotification({
              type: 'info',
              title: 'Configuration Applied',
              message: `Đang sử dụng configuration "${config.config_name}"`,
              configId: config.id,
              read: false
            })
          }
        },

        applyConfiguration: async (id) => {
          const config = get().configurations.find(c => c.id === id)
          if (config) {
            get().setCurrentConfig(config)
          } else {
            throw new Error('Configuration không tồn tại')
          }
        },

        clearCurrentConfig: () => {
          set((state) => {
            state.currentConfig = null
          })
        },

        // ===== NOTIFICATIONS =====

        addNotification: (notification) => {
          set((state) => {
            const newNotification: ConfigNotification = {
              ...notification,
              id: generateNotificationId(),
              timestamp: Date.now()
            }
            
            state.notifications.unshift(newNotification)
            
            // Keep only last 50 notifications
            if (state.notifications.length > 50) {
              state.notifications = state.notifications.slice(0, 50)
            }
            
            // Update unread count
            state.unreadCount = state.notifications.filter(n => !n.read).length
          })
        },

        markNotificationRead: (id) => {
          set((state) => {
            const notification = state.notifications.find(n => n.id === id)
            if (notification) {
              notification.read = true
              state.unreadCount = state.notifications.filter(n => !n.read).length
            }
          })
        },

        clearNotifications: () => {
          set((state) => {
            state.notifications = state.notifications.filter(n => !n.read)
            state.unreadCount = state.notifications.filter(n => !n.read).length
          })
        },

        clearAllNotifications: () => {
          set((state) => {
            state.notifications = []
            state.unreadCount = 0
          })
        },

        // ===== CACHE MANAGEMENT =====

        invalidateCache: () => {
          set((state) => {
            state.cacheTimestamp = null
          })
        },

        refreshConfigurations: async () => {
          get().invalidateCache()
          cacheUtils.invalidateAllConfigurations()
          await get().loadConfigurations()
        },

        // ===== UTILITY ACTIONS =====

        clearError: () => {
          set((state) => {
            state.error = null
          })
        },

        reset: () => {
          set((state) => {
            Object.assign(state, initialState)
          })
        }

      })),
      {
        name: 'mapping-config-store',
      }
    )
  )

// ===== EXPORT STORE FOR DIRECT USAGE =====
// Use useMappingConfigStore directly to avoid infinite loops
