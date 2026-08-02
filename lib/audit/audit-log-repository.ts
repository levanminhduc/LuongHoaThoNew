import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const PASSWORD_RESET_LOG_SELECT = `
        id,
        employee_id,
        action,
        ip_address,
        details,
        created_at
      `;

const PASSWORD_RESET_ACTIONS = [
  "forgot_password_success",
  "forgot_password_failed",
  "forgot_password_blocked",
];

export interface PasswordResetHistoryFilters {
  employeeCode: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  ipAddress: string | null;
  page: number;
  limit: number;
}

export interface SecurityLogEntry {
  employeeId: string | null;
  action: string;
  ipAddress: string;
  details: string;
}

export interface EmployeeSecurityEvent {
  employeeId: string | null;
  event: string;
  ipHash: string;
  userAgent: string;
  details?: Record<string, unknown>;
}

function endOfDayIso(endDate: string): string {
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);
  return endDateTime.toISOString();
}

export function buildPasswordResetHistoryQuery(
  supabase: SupabaseServiceClient,
  filters: PasswordResetHistoryFilters,
) {
  const { employeeCode, status, startDate, endDate, ipAddress, page, limit } =
    filters;

  let query = supabase
    .from("security_logs")
    .select(PASSWORD_RESET_LOG_SELECT, { count: "exact" })
    .in("action", PASSWORD_RESET_ACTIONS)
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
    query = query.lte("created_at", endOfDayIso(endDate));
  }

  if (ipAddress) {
    query = query.ilike("ip_address", `${ipAddress.trim()}%`);
  }

  const offset = (page - 1) * limit;
  return query.range(offset, offset + limit - 1);
}

export async function insertSecurityLog(
  supabase: SupabaseServiceClient,
  entry: SecurityLogEntry,
): Promise<void> {
  try {
    await supabase.from("security_logs").insert({
      employee_id: entry.employeeId,
      action: entry.action,
      ip_address: entry.ipAddress,
      details: entry.details,
    });
  } catch (error) {
    console.error("Failed to log to security_logs:", error);
  }
}

export async function insertEmployeeSecurityEvent(
  supabase: SupabaseServiceClient,
  event: EmployeeSecurityEvent,
): Promise<void> {
  try {
    await supabase.from("employee_security_events").insert({
      employee_id: event.employeeId,
      event: event.event,
      ip_hash: event.ipHash,
      user_agent: event.userAgent,
      details: event.details || {},
      occurred_at: getVietnamTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}
