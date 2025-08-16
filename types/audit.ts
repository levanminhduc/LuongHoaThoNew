// =====================================================
// AUDIT SYSTEM TYPES
// =====================================================

export type AuditActionType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'DEACTIVATE' 
  | 'ACTIVATE' 
  | 'PASSWORD_CHANGE' 
  | 'EMPLOYEE_ID_CHANGE' 
  | 'CASCADE_UPDATE'

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL'

export interface AuditLogEntry {
  adminUserId: string
  adminUserName?: string
  employeeId: string
  employeeName?: string
  actionType: AuditActionType
  fieldName?: string
  oldValue?: string
  newValue?: string
  changeReason?: string
  batchId?: string
  cascadeOperation?: boolean
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogResult {
  success: boolean
  auditId?: string
  error?: string
}

export interface EmployeeAuditLog {
  id: string
  timestamp: string
  adminUserName: string
  actionType: AuditActionType
  fieldName?: string
  oldValue?: string
  newValue?: string
  changeReason?: string
  status: AuditStatus
}

export interface AuditLogResponse {
  success: boolean
  logs: EmployeeAuditLog[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

// Field change tracking
export interface FieldChange {
  fieldName: string
  oldValue: string
  newValue: string
}

// Cascade update statistics
export interface CascadeUpdateStats {
  payrolls: number
  signature_logs: number
  department_permissions_employee: number
  department_permissions_granted_by: number
  management_signatures: number
  access_logs_employee_accessed: number
  access_logs_user_id: number
  payroll_audit_logs: number
  employees: number
}

// Database audit log record
export interface AuditLogRecord {
  id: string
  timestamp: string
  admin_user_id: string
  admin_user_name?: string
  ip_address?: string
  user_agent?: string
  employee_id: string
  employee_name?: string
  action_type: AuditActionType
  table_name: string
  field_name?: string
  old_value?: string
  new_value?: string
  change_reason?: string
  batch_id?: string
  cascade_operation: boolean
  status: AuditStatus
  error_message?: string
  created_at: string
}

// API request/response types
export interface GetAuditLogsRequest {
  employeeId: string
  limit?: number
  offset?: number
}

export interface GetAuditLogsResponse {
  success: boolean
  logs?: EmployeeAuditLog[]
  pagination?: {
    limit: number
    offset: number
    hasMore: boolean
  }
  error?: string
}

// Audit service configuration
export interface AuditServiceConfig {
  enableLogging: boolean
  logFailedOperations: boolean
  maxRetries: number
  retryDelay: number
  batchSize: number
}

// Audit log filters
export interface AuditLogFilters {
  employeeId?: string
  adminUserId?: string
  actionType?: AuditActionType
  status?: AuditStatus
  dateFrom?: string
  dateTo?: string
  fieldName?: string
  batchId?: string
  cascadeOperation?: boolean
}

// Audit log summary
export interface AuditLogSummary {
  totalLogs: number
  actionTypeCounts: Record<AuditActionType, number>
  statusCounts: Record<AuditStatus, number>
  topAdminUsers: Array<{
    adminUserId: string
    adminUserName: string
    count: number
  }>
  recentActivity: EmployeeAuditLog[]
}

// Export all types
export type {
  AuditActionType,
  AuditStatus,
  AuditLogEntry,
  AuditLogResult,
  EmployeeAuditLog,
  AuditLogResponse,
  FieldChange,
  CascadeUpdateStats,
  AuditLogRecord,
  GetAuditLogsRequest,
  GetAuditLogsResponse,
  AuditServiceConfig,
  AuditLogFilters,
  AuditLogSummary
}
