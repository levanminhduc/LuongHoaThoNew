import type { createServiceClient } from "@/utils/supabase/server";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const LEGACY_PASSWORD_RESET_LOG_SELECT = `
        id,
        employee_id,
        action,
        ip_address,
        details,
        created_at
      `;

export interface LegacyPasswordResetHistoryFilters {
  employeeCode: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  ipAddress: string | null;
  page: number;
  limit: number;
}

/**
 * Bản sao nguyên văn truy vấn tại app/api/admin/password-reset-history/route.ts:67-110
 * ở commit 24c9812, trước khi rút xuống audit-log-repository.
 */
export function legacyPasswordResetHistoryQuery(
  supabase: SupabaseServiceClient,
  filters: LegacyPasswordResetHistoryFilters,
) {
  const { employeeCode, status, startDate, endDate, ipAddress, page, limit } =
    filters;

  let query = supabase
    .from("security_logs")
    .select(LEGACY_PASSWORD_RESET_LOG_SELECT, { count: "exact" })
    .in("action", [
      "forgot_password_success",
      "forgot_password_failed",
      "forgot_password_blocked",
    ])
    .order("created_at", { ascending: false });

  if (employeeCode) {
    query = query.eq("employee_id", employeeCode.trim());
  }

  if (status && status !== "all") {
    query = query.eq("action", status);
  }

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endDateTime.toISOString());
  }

  if (ipAddress) {
    query = query.ilike("ip_address", `${ipAddress.trim()}%`);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  return query;
}

/**
 * Bản sao nguyên văn logToSecurityLogs tại app/api/auth/forgot-password/route.ts:50-69.
 * employee/change-password/route.ts:22-40 giống hệt, chỉ khác details đã là chuỗi sẵn.
 */
export async function legacyInsertSecurityLog(
  supabase: SupabaseServiceClient,
  employeeId: string | null,
  action: string,
  ipAddress: string,
  details: string,
) {
  await supabase.from("security_logs").insert({
    employee_id: employeeId,
    action,
    ip_address: ipAddress,
    details,
  });
}

/**
 * Bản sao nguyên văn logSecurityEvent tại app/api/auth/forgot-password/route.ts:29-48
 * và app/api/auth/change-password-with-cccd/route.ts:37-57 (hai bản giống hệt nhau).
 */
export async function legacyInsertEmployeeSecurityEvent(
  supabase: SupabaseServiceClient,
  employeeId: string | null,
  event: string,
  ipHash: string,
  userAgent: string,
  occurredAt: string,
  details?: Record<string, unknown>,
) {
  await supabase.from("employee_security_events").insert({
    employee_id: employeeId,
    event,
    ip_hash: ipHash,
    user_agent: userAgent,
    details: details || {},
    occurred_at: occurredAt,
  });
}
