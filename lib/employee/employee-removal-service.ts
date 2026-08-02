import "server-only";
import { auditService } from "@/lib/audit-service";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { findAnyPayrollForEmployee } from "@/lib/payroll/payroll-admin-repository";
import {
  deactivateEmployee,
  deleteEmployee,
  findEmployeeNameById,
  type SupabaseServiceClient,
} from "@/lib/employee/employee-admin-repository";
import type { AdminActor } from "@/lib/employee/employee-update-service";

export type EmployeeRemovalResult =
  | { status: "not_found" }
  | { status: "deactivate_failed" }
  | { status: "delete_failed" }
  | { status: "deactivated" }
  | { status: "deleted" };

function adminName(admin: AdminActor) {
  return admin.full_name || admin.employee_id;
}

async function logWithoutFailing(
  writeAuditEntry: () => Promise<unknown>,
  failureMessage: string,
) {
  try {
    await writeAuditEntry();
  } catch (auditError) {
    console.error(failureMessage, auditError);
  }
}

async function deactivateBecausePayrollExists(
  supabase: SupabaseServiceClient,
  employeeId: string,
  employeeName: string,
  admin: AdminActor,
): Promise<EmployeeRemovalResult> {
  const { error } = await deactivateEmployee(supabase, employeeId, {
    is_active: false,
    updated_at: getVietnamTimestamp(),
  });

  if (error) {
    console.error("Error deactivating employee:", error);
    await logWithoutFailing(
      () =>
        auditService.logFailedOperation(
          admin.employee_id,
          adminName(admin),
          employeeId,
          "DEACTIVATE",
          error.message,
        ),
      "Audit logging failed:",
    );
    return { status: "deactivate_failed" };
  }

  await logWithoutFailing(
    () =>
      auditService.logEmployeeChange({
        adminUserId: admin.employee_id,
        adminUserName: adminName(admin),
        employeeId,
        employeeName,
        actionType: "DEACTIVATE",
        fieldName: "is_active",
        oldValue: "true",
        newValue: "false",
        changeReason: "Employee deactivated due to existing payroll data",
      }),
    "Audit logging failed:",
  );

  return { status: "deactivated" };
}

async function deletePermanently(
  supabase: SupabaseServiceClient,
  employeeId: string,
  employeeName: string,
  admin: AdminActor,
): Promise<EmployeeRemovalResult> {
  const { error } = await deleteEmployee(supabase, employeeId);

  if (error) {
    console.error("Error deleting employee:", error);
    await logWithoutFailing(
      () =>
        auditService.logFailedOperation(
          admin.employee_id,
          adminName(admin),
          employeeId,
          "DELETE",
          error.message,
        ),
      "Audit logging failed:",
    );
    return { status: "delete_failed" };
  }

  await logWithoutFailing(
    () =>
      auditService.logEmployeeChange({
        adminUserId: admin.employee_id,
        adminUserName: adminName(admin),
        employeeId,
        employeeName,
        actionType: "DELETE",
        changeReason: "Employee permanently deleted (no payroll data)",
      }),
    "Audit logging failed:",
  );

  return { status: "deleted" };
}

export async function removeEmployee(
  supabase: SupabaseServiceClient,
  employeeId: string,
  admin: AdminActor,
): Promise<EmployeeRemovalResult> {
  const { data: existing } = await findEmployeeNameById(supabase, employeeId);

  if (!existing) {
    return { status: "not_found" };
  }

  const { data: payrollCheck } = await findAnyPayrollForEmployee(
    supabase,
    employeeId,
  );

  const hasPayrollData = Boolean(payrollCheck && payrollCheck.length > 0);

  if (hasPayrollData) {
    return deactivateBecausePayrollExists(
      supabase,
      employeeId,
      existing.full_name,
      admin,
    );
  }

  return deletePermanently(supabase, employeeId, existing.full_name, admin);
}
