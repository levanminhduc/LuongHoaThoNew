import { createServiceClient } from "@/utils/supabase/server"
import { headers } from "next/headers"

// =====================================================
// AUDIT SERVICE TYPES
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
  audit_timestamp: string
  admin_user_name: string
  action_type: AuditActionType
  field_name?: string
  old_value?: string
  new_value?: string
  change_reason?: string
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL'
}

// =====================================================
// AUDIT SERVICE CLASS
// =====================================================

export class EmployeeAuditService {
  private supabase = createServiceClient()

  /**
   * Get client IP address from request headers
   */
  private getClientIP(): string | null {
    const headersList = headers()
    
    // Try various headers for IP address
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ]

    for (const header of ipHeaders) {
      const value = headersList.get(header)
      if (value) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return value.split(',')[0].trim()
      }
    }

    return null
  }

  /**
   * Get user agent from request headers
   */
  private getUserAgent(): string | null {
    const headersList = headers()
    return headersList.get('user-agent')
  }

  /**
   * Log a single employee change
   */
  async logEmployeeChange(entry: AuditLogEntry): Promise<AuditLogResult> {
    try {
      const ipAddress = this.getClientIP()
      const userAgent = this.getUserAgent()

      const { data, error } = await this.supabase.rpc('log_employee_change', {
        p_admin_user_id: entry.adminUserId,
        p_admin_user_name: entry.adminUserName || null,
        p_employee_id: entry.employeeId,
        p_employee_name: entry.employeeName || null,
        p_action_type: entry.actionType,
        p_field_name: entry.fieldName || null,
        p_old_value: entry.oldValue || null,
        p_new_value: entry.newValue || null,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_change_reason: entry.changeReason || null,
        p_batch_id: entry.batchId || null,
        p_cascade_operation: entry.cascadeOperation || false
      })

      if (error) {
        console.error('Audit log error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, auditId: data }
    } catch (error) {
      console.error('Audit service error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Log a failed operation
   */
  async logFailedOperation(
    adminUserId: string,
    adminUserName: string,
    employeeId: string,
    actionType: AuditActionType,
    errorMessage: string
  ): Promise<AuditLogResult> {
    try {
      const ipAddress = this.getClientIP()
      const userAgent = this.getUserAgent()

      const { data, error } = await this.supabase.rpc('log_employee_change_failed', {
        p_admin_user_id: adminUserId,
        p_admin_user_name: adminUserName,
        p_employee_id: employeeId,
        p_action_type: actionType,
        p_error_message: errorMessage,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      })

      if (error) {
        console.error('Failed operation audit log error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, auditId: data }
    } catch (error) {
      console.error('Failed operation audit service error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Log multiple field changes in a batch
   */
  async logEmployeeUpdate(
    adminUserId: string,
    adminUserName: string,
    employeeId: string,
    employeeName: string,
    changes: Array<{
      fieldName: string
      oldValue: string
      newValue: string
    }>,
    changeReason?: string
  ): Promise<AuditLogResult> {
    try {
      const batchId = crypto.randomUUID()
      const results: AuditLogResult[] = []

      // Log each field change
      for (const change of changes) {
        const result = await this.logEmployeeChange({
          adminUserId,
          adminUserName,
          employeeId,
          employeeName,
          actionType: 'UPDATE',
          fieldName: change.fieldName,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changeReason,
          batchId
        })
        results.push(result)
      }

      // Check if all logs were successful
      const allSuccessful = results.every(r => r.success)
      
      return {
        success: allSuccessful,
        auditId: batchId,
        error: allSuccessful ? undefined : 'Some audit logs failed'
      }
    } catch (error) {
      console.error('Batch audit log error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Log cascade update operation
   */
  async logCascadeUpdate(
    adminUserId: string,
    adminUserName: string,
    oldEmployeeId: string,
    newEmployeeId: string,
    employeeName: string,
    affectedTables: Record<string, number>
  ): Promise<AuditLogResult> {
    try {
      const batchId = crypto.randomUUID()

      // Log the main employee ID change
      await this.logEmployeeChange({
        adminUserId,
        adminUserName,
        employeeId: oldEmployeeId,
        employeeName,
        actionType: 'EMPLOYEE_ID_CHANGE',
        fieldName: 'employee_id',
        oldValue: oldEmployeeId,
        newValue: newEmployeeId,
        changeReason: 'Cascade update operation',
        batchId,
        cascadeOperation: true
      })

      // Log affected tables
      for (const [tableName, count] of Object.entries(affectedTables)) {
        if (count > 0) {
          await this.logEmployeeChange({
            adminUserId,
            adminUserName,
            employeeId: newEmployeeId, // Use new ID for cascade operations
            employeeName,
            actionType: 'CASCADE_UPDATE',
            fieldName: `${tableName}.employee_id`,
            oldValue: oldEmployeeId,
            newValue: newEmployeeId,
            changeReason: `Cascade update: ${count} records updated in ${tableName}`,
            batchId,
            cascadeOperation: true
          })
        }
      }

      return { success: true, auditId: batchId }
    } catch (error) {
      console.error('Cascade update audit log error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get audit logs for an employee
   */
  async getEmployeeAuditLogs(
    employeeId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; logs?: EmployeeAuditLog[]; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_employee_audit_logs', {
        p_employee_id: employeeId,
        p_limit: limit,
        p_offset: offset
      })

      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true, logs: data || [] }
    } catch (error) {
      console.error('Get audit logs service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const auditService = new EmployeeAuditService()
