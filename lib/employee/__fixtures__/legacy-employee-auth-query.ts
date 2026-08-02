import type { SupabaseServiceClient } from "@/lib/employee/employee-repository";

/**
 * Bản sao nguyên văn truy vấn tại app/api/employee/sign-bonus/route.ts:60-64
 * ở commit aa00118~1, trước khi gộp về findEmployeeAuthRecord.
 */
export async function legacySignBonusEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, cccd_hash, password_hash, last_password_change_at")
    .eq("employee_id", employeeId.trim())
    .single();
}

/**
 * Bản sao nguyên văn truy vấn tại app/api/employee/lookup/route.ts:306-312
 * ở cùng commit — đây là bản select rộng nhất trong 3 call site cũ.
 */
export async function legacyLookupEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at",
    )
    .eq("employee_id", employeeId)
    .single();
}
