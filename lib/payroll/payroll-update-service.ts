import "server-only";
import { createServiceClient } from "@/utils/supabase/server";
import type { AuthContext } from "@/lib/auth-middleware";
import { ApiErrorHandler } from "@/lib/api-error-handler";
import { assertDepartmentAccess } from "@/lib/auth/department-scope";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/app-error";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  findPayrollForUpdate,
  insertPayrollAuditLogs,
  updatePayrollById,
} from "@/lib/payroll/payroll-repository";

export interface PayrollUpdateInput {
  updates: Record<string, number | undefined>;
  changeReason: string;
}

export interface PayrollUpdateAuditMeta {
  clientIp: string;
}

interface CurrentPayroll extends Record<string, unknown> {
  employee_id: string;
  salary_month: string;
  is_signed: boolean;
  employees: { department: string } | { department: string }[] | null;
}

function readDepartment(employees: CurrentPayroll["employees"]): string {
  const employee = Array.isArray(employees) ? employees[0] : employees;
  return employee?.department ?? "";
}

function payrollAlreadySignedError() {
  return new AppError(
    "Phiếu lương đã ký, không sửa được",
    ApiErrorHandler.ErrorCodes.CONSTRAINT_VIOLATION,
    409,
  );
}

function collectChanges(
  current: CurrentPayroll,
  updates: PayrollUpdateInput["updates"],
) {
  return Object.entries(updates).filter(
    ([field, newValue]) => current[field] !== newValue,
  );
}

export async function updatePayrollRecord(
  auth: AuthContext,
  payrollId: number,
  { updates, changeReason }: PayrollUpdateInput,
  { clientIp }: PayrollUpdateAuditMeta,
) {
  const supabase = createServiceClient();

  const { data, error } = await findPayrollForUpdate(supabase, payrollId);
  if (error || !data) throw new NotFoundError("Không tìm thấy bản ghi lương");
  const current = data as unknown as CurrentPayroll;

  assertDepartmentAccess(auth, readDepartment(current.employees));

  if (current.is_signed) throw payrollAlreadySignedError();

  const changes = collectChanges(current, updates);
  if (changes.length === 0) {
    throw new ValidationError("Không có thay đổi nào để cập nhật");
  }

  const { data: updated, error: updateError } = await updatePayrollById(
    supabase,
    payrollId,
    {
      ...Object.fromEntries(changes),
      updated_at: getVietnamTimestamp(),
    },
  );
  if (updateError) {
    console.error("Update payroll error:", updateError);
    throw new AppError(
      "Lỗi khi cập nhật dữ liệu lương",
      ApiErrorHandler.ErrorCodes.DATABASE_ERROR,
      500,
    );
  }
  if (!updated) throw payrollAlreadySignedError();

  const auditLogs = changes.map(([field, newValue]) => ({
    payroll_id: payrollId,
    employee_id: current.employee_id,
    salary_month: current.salary_month,
    changed_by: auth.user.username,
    change_ip: clientIp,
    change_reason: changeReason,
    field_name: field,
    old_value: String(current[field] || ""),
    new_value: String(newValue || ""),
  }));

  const { error: auditError } = await insertPayrollAuditLogs(
    supabase,
    auditLogs,
  );
  if (auditError) console.error("Audit log error:", auditError);

  return { payroll: updated, changesCount: auditLogs.length };
}
