import "server-only";
import bcrypt from "bcryptjs";
import { auditService } from "@/lib/audit-service";
import { BCRYPT_ROUNDS } from "@/lib/constants/security";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { cascadeUpdateEmployeeId } from "@/lib/employee/cascade-update-employee";
import {
  findEmployeeForEdit,
  updateEmployeeById,
  type SupabaseServiceClient,
} from "@/lib/employee/employee-admin-repository";

export interface EmployeeUpdateInput {
  employee_id: string;
  full_name: string;
  cccd?: string;
  password?: string;
  chuc_vu: string;
  department?: string | null;
  phone_number?: string | null;
  is_active?: boolean;
}

export interface AdminActor {
  employee_id: string;
  full_name?: string | null;
}

interface FieldChange {
  fieldName: string;
  oldValue: string;
  newValue: string;
}

interface EmployeeEditSnapshot {
  full_name: string | null;
  chuc_vu: string | null;
  department: string | null;
  phone_number: string | null;
  is_active: boolean | null;
}

export type EmployeeUpdateResult =
  | { status: "not_found" }
  | { status: "cascade_failed"; message: string; details?: string }
  | { status: "update_failed" }
  | {
      status: "updated";
      employee: Record<string, unknown>;
      employeeIdChanged: false;
    }
  | {
      status: "cascade_updated";
      employee: Record<string, unknown>;
      cascadeMessage: string;
      cascadeStats: unknown;
    };

function resolveIsActive(isActive?: boolean) {
  return isActive !== undefined ? isActive : true;
}

function adminName(admin: AdminActor) {
  return admin.full_name || admin.employee_id;
}

async function buildUpdateData(input: EmployeeUpdateInput) {
  const updateData: Record<string, unknown> = {
    full_name: input.full_name,
    chuc_vu: input.chuc_vu,
    department: input.department || null,
    phone_number: input.phone_number || null,
    is_active: resolveIsActive(input.is_active),
    updated_at: getVietnamTimestamp(),
  };

  if (input.cccd) {
    updateData.cccd_hash = await bcrypt.hash(input.cccd, BCRYPT_ROUNDS);
  }

  if (input.password) {
    updateData.password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    updateData.last_password_change_at = getVietnamTimestamp();
  }

  return updateData;
}

function secretFieldChanges(input: EmployeeUpdateInput): FieldChange[] {
  const changes: FieldChange[] = [];

  if (input.password) {
    changes.push({
      fieldName: "password",
      oldValue: "[HIDDEN]",
      newValue: "[CHANGED]",
    });
  }

  if (input.cccd) {
    changes.push({
      fieldName: "cccd",
      oldValue: "[HIDDEN]",
      newValue: "[CHANGED]",
    });
  }

  return changes;
}

function visibleFieldChanges(
  existing: EmployeeEditSnapshot,
  input: EmployeeUpdateInput,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const nextIsActive = resolveIsActive(input.is_active);

  if (existing.full_name !== input.full_name) {
    changes.push({
      fieldName: "full_name",
      oldValue: existing.full_name || "",
      newValue: input.full_name,
    });
  }

  if (existing.chuc_vu !== input.chuc_vu) {
    changes.push({
      fieldName: "chuc_vu",
      oldValue: existing.chuc_vu || "",
      newValue: input.chuc_vu,
    });
  }

  if (existing.department !== (input.department || null)) {
    changes.push({
      fieldName: "department",
      oldValue: existing.department || "",
      newValue: input.department || "",
    });
  }

  if (existing.phone_number !== (input.phone_number || null)) {
    changes.push({
      fieldName: "phone_number",
      oldValue: existing.phone_number || "",
      newValue: input.phone_number || "",
    });
  }

  if (existing.is_active !== nextIsActive) {
    changes.push({
      fieldName: "is_active",
      oldValue: existing.is_active ? "true" : "false",
      newValue: nextIsActive ? "true" : "false",
    });
  }

  return changes;
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

async function applyCascadeRename(
  supabase: SupabaseServiceClient,
  currentId: string,
  input: EmployeeUpdateInput,
  admin: AdminActor,
): Promise<EmployeeUpdateResult> {
  console.log(`Employee ID changing: ${currentId} → ${input.employee_id}`);

  const cascadeResult = await cascadeUpdateEmployeeId(
    currentId,
    input.employee_id,
    admin.employee_id,
    adminName(admin),
  );

  if (!cascadeResult.success) {
    return {
      status: "cascade_failed",
      message: cascadeResult.message,
      details: cascadeResult.error,
    };
  }

  const updateData = await buildUpdateData(input);
  const { data: updatedEmployee, error } = await updateEmployeeById(
    supabase,
    input.employee_id,
    updateData,
  );

  if (error) {
    console.error("Error updating additional fields:", error);
    return { status: "update_failed" };
  }

  const changes = secretFieldChanges(input);
  if (changes.length > 0) {
    await logWithoutFailing(
      () =>
        auditService.logEmployeeUpdate(
          admin.employee_id,
          adminName(admin),
          input.employee_id,
          updatedEmployee.full_name,
          changes,
          "Sensitive fields updated during cascade operation",
        ),
      "Audit logging failed during cascade:",
    );
  }

  return {
    status: "cascade_updated",
    employee: updatedEmployee,
    cascadeMessage: cascadeResult.message,
    cascadeStats: cascadeResult.affectedTables,
  };
}

export async function updateEmployee(
  supabase: SupabaseServiceClient,
  currentId: string,
  input: EmployeeUpdateInput,
  admin: AdminActor,
): Promise<EmployeeUpdateResult> {
  const { data: existing } = await findEmployeeForEdit(supabase, currentId);

  if (!existing) {
    return { status: "not_found" };
  }

  if (input.employee_id !== currentId) {
    return applyCascadeRename(supabase, currentId, input, admin);
  }

  const updateData = await buildUpdateData(input);
  const { data: updatedEmployee, error } = await updateEmployeeById(
    supabase,
    currentId,
    updateData,
  );

  if (error) {
    console.error("Error updating employee:", error);
    await logWithoutFailing(
      () =>
        auditService.logFailedOperation(
          admin.employee_id,
          adminName(admin),
          currentId,
          "UPDATE",
          error.message,
        ),
      "Audit logging failed:",
    );
    return { status: "update_failed" };
  }

  const changes = [
    ...visibleFieldChanges(existing, input),
    ...secretFieldChanges(input),
  ];

  if (changes.length > 0) {
    await logWithoutFailing(
      () =>
        auditService.logEmployeeUpdate(
          admin.employee_id,
          adminName(admin),
          currentId,
          updatedEmployee.full_name,
          changes,
          "Employee information updated via admin panel",
        ),
      "Audit logging failed:",
    );
  }

  return {
    status: "updated",
    employee: updatedEmployee,
    employeeIdChanged: false,
  };
}
