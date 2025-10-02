import { createServiceClient } from "@/utils/supabase/server";
import { auditService } from "./audit-service";

interface CascadeUpdateResult {
  success: boolean;
  message: string;
  affectedTables: Record<string, number>;
  error?: string;
}

interface CascadeUpdateStats {
  payrolls: number;
  signature_logs: number;
  department_permissions_employee: number;
  department_permissions_granted_by: number;
  management_signatures: number;
  access_logs_employee_accessed: number;
  access_logs_user_id: number;
  payroll_audit_logs: number;
  employees: number;
}

export async function cascadeUpdateEmployeeId(
  oldEmployeeId: string,
  newEmployeeId: string,
  adminUserId?: string,
  adminUserName?: string,
): Promise<CascadeUpdateResult> {
  const supabase = createServiceClient();

  try {
    // ===== PHASE 1: PRE-VALIDATION =====
    console.log(`Starting cascade update: ${oldEmployeeId} → ${newEmployeeId}`);

    // Validate new employee_id format
    if (!/^[A-Za-z0-9]+$/.test(newEmployeeId)) {
      return {
        success: false,
        message: "Mã nhân viên mới không hợp lệ (chỉ chữ và số)",
        affectedTables: {},
      };
    }

    // Check if old employee exists
    const { data: oldEmployee, error: oldEmployeeError } = await supabase
      .from("employees")
      .select("employee_id, full_name")
      .eq("employee_id", oldEmployeeId)
      .single();

    if (oldEmployeeError || !oldEmployee) {
      return {
        success: false,
        message: "Nhân viên cũ không tồn tại",
        affectedTables: {},
      };
    }

    // Check if new employee_id already exists
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("employee_id")
      .eq("employee_id", newEmployeeId)
      .single();

    if (existingEmployee) {
      return {
        success: false,
        message: "Mã nhân viên mới đã tồn tại",
        affectedTables: {},
      };
    }

    // Count affected records for reporting
    const stats: CascadeUpdateStats = {
      payrolls: 0,
      signature_logs: 0,
      department_permissions_employee: 0,
      department_permissions_granted_by: 0,
      management_signatures: 0,
      access_logs_employee_accessed: 0,
      access_logs_user_id: 0,
      payroll_audit_logs: 0,
      employees: 1,
    };

    // Count records in each table
    const { count: payrollsCount } = await supabase
      .from("payrolls")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", oldEmployeeId);
    stats.payrolls = payrollsCount || 0;

    const { count: signatureLogsCount } = await supabase
      .from("signature_logs")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", oldEmployeeId);
    stats.signature_logs = signatureLogsCount || 0;

    const { count: deptPermEmployeeCount } = await supabase
      .from("department_permissions")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", oldEmployeeId);
    stats.department_permissions_employee = deptPermEmployeeCount || 0;

    const { count: deptPermGrantedByCount } = await supabase
      .from("department_permissions")
      .select("*", { count: "exact", head: true })
      .eq("granted_by", oldEmployeeId);
    stats.department_permissions_granted_by = deptPermGrantedByCount || 0;

    const { count: managementSigCount } = await supabase
      .from("management_signatures")
      .select("*", { count: "exact", head: true })
      .eq("signed_by_id", oldEmployeeId);
    stats.management_signatures = managementSigCount || 0;

    const { count: accessLogsEmployeeCount } = await supabase
      .from("access_logs")
      .select("*", { count: "exact", head: true })
      .eq("employee_accessed", oldEmployeeId);
    stats.access_logs_employee_accessed = accessLogsEmployeeCount || 0;

    const { count: accessLogsUserCount } = await supabase
      .from("access_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", oldEmployeeId);
    stats.access_logs_user_id = accessLogsUserCount || 0;

    const { count: auditLogsCount } = await supabase
      .from("payroll_audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", oldEmployeeId);
    stats.payroll_audit_logs = auditLogsCount || 0;

    console.log("Affected records count:", stats);

    // ===== PHASE 2: SUPABASE TRANSACTION EXECUTION =====
    // Supabase doesn't support explicit transactions, so we'll do sequential updates
    // with error handling and rollback capability

    const updatedStats: CascadeUpdateStats = {
      payrolls: 0,
      signature_logs: 0,
      department_permissions_employee: 0,
      department_permissions_granted_by: 0,
      management_signatures: 0,
      access_logs_employee_accessed: 0,
      access_logs_user_id: 0,
      payroll_audit_logs: 0,
      employees: 0,
    };

    // Track what we've updated for potential rollback
    const rollbackData: Array<{
      table: string;
      field: string;
      oldValue: string;
      newValue: string;
    }> = [];

    try {
      // STRATEGY: Update employees table FIRST to satisfy foreign key constraints
      // Then update other tables that reference the new employee_id

      // 1. Update employees table FIRST (to satisfy FK constraints)
      const { error: employeesError } = await supabase
        .from("employees")
        .update({
          employee_id: newEmployeeId,
          updated_at: new Date().toISOString(),
        })
        .eq("employee_id", oldEmployeeId);

      if (employeesError)
        throw new Error(`Employees update failed: ${employeesError.message}`);
      updatedStats.employees = 1;
      rollbackData.push({
        table: "employees",
        field: "employee_id",
        oldValue: oldEmployeeId,
        newValue: newEmployeeId,
      });
      console.log(`Updated 1 record in employees`);

      // 2. Update payrolls table (now FK constraint is satisfied)
      if (stats.payrolls > 0) {
        const { error: payrollsError } = await supabase
          .from("payrolls")
          .update({
            employee_id: newEmployeeId,
            updated_at: new Date().toISOString(),
          })
          .eq("employee_id", oldEmployeeId);

        if (payrollsError)
          throw new Error(`Payrolls update failed: ${payrollsError.message}`);
        updatedStats.payrolls = stats.payrolls;
        rollbackData.push({
          table: "payrolls",
          field: "employee_id",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(`Updated ${stats.payrolls} records in payrolls`);
      }

      // 2. Update signature_logs table (Critical data)
      if (stats.signature_logs > 0) {
        const { error: signatureError } = await supabase
          .from("signature_logs")
          .update({ employee_id: newEmployeeId })
          .eq("employee_id", oldEmployeeId);

        if (signatureError)
          throw new Error(
            `Signature logs update failed: ${signatureError.message}`,
          );
        updatedStats.signature_logs = stats.signature_logs;
        rollbackData.push({
          table: "signature_logs",
          field: "employee_id",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.signature_logs} records in signature_logs`,
        );
      }

      // 3. Update signature_logs table (Critical data)
      if (stats.signature_logs > 0) {
        const { error: signatureError } = await supabase
          .from("signature_logs")
          .update({ employee_id: newEmployeeId })
          .eq("employee_id", oldEmployeeId);

        if (signatureError)
          throw new Error(
            `Signature logs update failed: ${signatureError.message}`,
          );
        updatedStats.signature_logs = stats.signature_logs;
        rollbackData.push({
          table: "signature_logs",
          field: "employee_id",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.signature_logs} records in signature_logs`,
        );
      }

      // 4. Update department_permissions.employee_id (Permission data)
      if (stats.department_permissions_employee > 0) {
        const { error: deptPermError } = await supabase
          .from("department_permissions")
          .update({ employee_id: newEmployeeId })
          .eq("employee_id", oldEmployeeId);

        if (deptPermError)
          throw new Error(
            `Department permissions (employee_id) update failed: ${deptPermError.message}`,
          );
        updatedStats.department_permissions_employee =
          stats.department_permissions_employee;
        rollbackData.push({
          table: "department_permissions",
          field: "employee_id",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.department_permissions_employee} records in department_permissions (employee_id)`,
        );
      }

      // 5. Update management_signatures.signed_by_id (Management data)
      if (stats.management_signatures > 0) {
        const { error: mgmtSigError } = await supabase
          .from("management_signatures")
          .update({ signed_by_id: newEmployeeId })
          .eq("signed_by_id", oldEmployeeId);

        if (mgmtSigError)
          throw new Error(
            `Management signatures update failed: ${mgmtSigError.message}`,
          );
        updatedStats.management_signatures = stats.management_signatures;
        rollbackData.push({
          table: "management_signatures",
          field: "signed_by_id",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.management_signatures} records in management_signatures`,
        );
      }

      // 6. Update department_permissions.granted_by (Reference data)
      if (stats.department_permissions_granted_by > 0) {
        const { error: deptPermGrantedError } = await supabase
          .from("department_permissions")
          .update({ granted_by: newEmployeeId })
          .eq("granted_by", oldEmployeeId);

        if (deptPermGrantedError)
          throw new Error(
            `Department permissions (granted_by) update failed: ${deptPermGrantedError.message}`,
          );
        updatedStats.department_permissions_granted_by =
          stats.department_permissions_granted_by;
        rollbackData.push({
          table: "department_permissions",
          field: "granted_by",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.department_permissions_granted_by} records in department_permissions (granted_by)`,
        );
      }

      // 7. Update access_logs.employee_accessed (Log data)
      if (stats.access_logs_employee_accessed > 0) {
        const { error: accessLogsEmpError } = await supabase
          .from("access_logs")
          .update({ employee_accessed: newEmployeeId })
          .eq("employee_accessed", oldEmployeeId);

        if (accessLogsEmpError)
          throw new Error(
            `Access logs (employee_accessed) update failed: ${accessLogsEmpError.message}`,
          );
        updatedStats.access_logs_employee_accessed =
          stats.access_logs_employee_accessed;
        rollbackData.push({
          table: "access_logs",
          field: "employee_accessed",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.access_logs_employee_accessed} records in access_logs (employee_accessed)`,
        );
      }

      // 8. Update access_logs.user_id (Log data)
      if (stats.access_logs_user_id > 0) {
        const { error: accessLogsUserError } = await supabase
          .from("access_logs")
          .update({ user_id: newEmployeeId })
          .eq("user_id", oldEmployeeId);

        if (accessLogsUserError)
          throw new Error(
            `Access logs (user_id) update failed: ${accessLogsUserError.message}`,
          );
        updatedStats.access_logs_user_id = stats.access_logs_user_id;
        rollbackData.push({
          table: "access_logs",
          field: "user_id",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.access_logs_user_id} records in access_logs (user_id)`,
        );
      }

      // 9. Update payroll_audit_logs.employee_id (Audit data)
      if (stats.payroll_audit_logs > 0) {
        const { error: auditLogsError } = await supabase
          .from("payroll_audit_logs")
          .update({ employee_id: newEmployeeId })
          .eq("employee_id", oldEmployeeId);

        if (auditLogsError)
          throw new Error(
            `Payroll audit logs update failed: ${auditLogsError.message}`,
          );
        updatedStats.payroll_audit_logs = stats.payroll_audit_logs;
        rollbackData.push({
          table: "payroll_audit_logs",
          field: "employee_id",
          oldValue: oldEmployeeId,
          newValue: newEmployeeId,
        });
        console.log(
          `Updated ${stats.payroll_audit_logs} records in payroll_audit_logs`,
        );
      }

      // Note: employees table already updated at the beginning to satisfy FK constraints
    } catch (updateError) {
      console.error("Update error, attempting rollback:", updateError);

      // Attempt rollback in reverse order
      for (let i = rollbackData.length - 1; i >= 0; i--) {
        const rollback = rollbackData[i];
        try {
          await supabase
            .from(rollback.table)
            .update({ [rollback.field]: rollback.oldValue })
            .eq(rollback.field, rollback.newValue);
          console.log(`Rolled back ${rollback.table}.${rollback.field}`);
        } catch (rollbackError) {
          console.error(
            `Rollback failed for ${rollback.table}.${rollback.field}:`,
            rollbackError,
          );
        }
      }

      return {
        success: false,
        message: `Update failed và đã rollback: ${updateError instanceof Error ? updateError.message : "Unknown error"}`,
        affectedTables: {},
        error:
          updateError instanceof Error ? updateError.message : "Unknown error",
      };
    }

    // ===== PHASE 3: POST-VALIDATION =====
    // Verify the update was successful
    const { data: updatedEmployee } = await supabase
      .from("employees")
      .select("employee_id, full_name")
      .eq("employee_id", newEmployeeId)
      .single();

    if (!updatedEmployee) {
      return {
        success: false,
        message: "Verification failed: Employee không tìm thấy sau update",
        affectedTables: {},
      };
    }

    const totalAffected = Object.values(updatedStats).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Log cascade update operation
    if (adminUserId && adminUserName) {
      try {
        await auditService.logCascadeUpdate(
          adminUserId,
          adminUserName,
          oldEmployeeId,
          newEmployeeId,
          updatedEmployee.full_name,
          updatedStats as unknown as Record<string, number>,
        );
        console.log(
          `Cascade update audit logged for ${oldEmployeeId} → ${newEmployeeId}`,
        );
      } catch (auditError) {
        console.error("Audit logging failed:", auditError);
        // Don't fail the main operation if audit logging fails
      }
    }

    return {
      success: true,
      message: `Cascade update thành công! Đã cập nhật ${totalAffected} records across ${Object.keys(updatedStats).filter((k) => updatedStats[k as keyof CascadeUpdateStats] > 0).length} tables.`,
      affectedTables: updatedStats as unknown as Record<string, number>,
    };
  } catch (error) {
    console.error("Cascade update error:", error);

    // Log failed cascade update
    if (adminUserId && adminUserName) {
      try {
        await auditService.logFailedOperation(
          adminUserId,
          adminUserName,
          oldEmployeeId,
          "CASCADE_UPDATE",
          error instanceof Error ? error.message : "Unknown error",
        );
      } catch (auditError) {
        console.error("Failed operation audit logging failed:", auditError);
      }
    }

    return {
      success: false,
      message: `Lỗi không mong muốn: ${error instanceof Error ? error.message : "Unknown error"}`,
      affectedTables: {},
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
