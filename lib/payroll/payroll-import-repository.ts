import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

export function findPayrollIdForMonth(
  supabase: SupabaseServiceClient,
  employeeId: string,
  salaryMonth: string,
) {
  return supabase
    .from("payrolls")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("salary_month", salaryMonth)
    .single();
}

export function updatePayrollForMonth(
  supabase: SupabaseServiceClient,
  employeeId: string,
  salaryMonth: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("payrolls")
    .update(updateData)
    .eq("employee_id", employeeId)
    .eq("salary_month", salaryMonth);
}

export function insertPayrollRecord(
  supabase: SupabaseServiceClient,
  insertData: Record<string, unknown>,
) {
  return supabase.from("payrolls").insert(insertData);
}

export function insertPayrollBatch(
  supabase: SupabaseServiceClient,
  rows: object[],
) {
  return supabase.from("payrolls").insert(rows).select();
}
