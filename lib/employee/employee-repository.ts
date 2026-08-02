import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const EMPLOYEE_AUTH_COLUMNS =
  "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at";

export interface EmployeeAuthRecord {
  employee_id: string;
  full_name: string | null;
  department: string | null;
  chuc_vu: string | null;
  cccd_hash: string | null;
  password_hash: string | null;
  last_password_change_at: string | null;
}

export async function findEmployeeAuthRecord(
  supabase: SupabaseServiceClient,
  employeeId: string,
): Promise<EmployeeAuthRecord | null> {
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_AUTH_COLUMNS)
    .eq("employee_id", employeeId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as EmployeeAuthRecord;
}
