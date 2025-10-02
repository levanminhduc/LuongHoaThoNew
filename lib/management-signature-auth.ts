import { type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-middleware";
import {
  isAllowedSignatureRole,
  canRoleSignType,
  type SignatureType,
} from "@/lib/signature-validation";

export interface ManagementSignatureAuth {
  user: {
    username: string;
    employee_id: string;
    role: string;
    department: string;
    allowed_departments?: string[];
    permissions: string[];
  };
  isRole: (role: string) => boolean;
  canSign: (signatureType: SignatureType) => boolean;
  canAccessSignatureHistory: () => boolean;
  canViewAllSignatures: () => boolean;
  hasPermission: (permission: string) => boolean;
  canAccessDepartment: (department: string) => boolean;
}

export function verifyManagementSignatureAuth(
  request: NextRequest,
): ManagementSignatureAuth | null {
  const auth = verifyToken(request);
  if (!auth) return null;

  if (!isAllowedSignatureRole(auth.user.role)) {
    return null;
  }

  return {
    user: auth.user,
    isRole: auth.isRole,
    canSign: (signatureType: SignatureType) => {
      return canRoleSignType(auth.user.role, signatureType);
    },
    canAccessSignatureHistory: () => {
      return ["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(
        auth.user.role,
      );
    },
    canViewAllSignatures: () => {
      return auth.user.role === "admin";
    },
    hasPermission: auth.hasPermission,
    canAccessDepartment: auth.canAccessDepartment,
  };
}

export interface RateLimitInfo {
  key: string;
  limit: number;
  windowMs: number;
  message: string;
}

export function getRateLimitInfo(
  endpoint: string,
  userRole: string,
): RateLimitInfo {
  const baseKey = `signature_api:${userRole}`;

  switch (endpoint) {
    case "signature-status":
      return {
        key: `${baseKey}:status`,
        limit: 60,
        windowMs: 60000,
        message: "Quá nhiều yêu cầu kiểm tra trạng thái ký",
      };
    case "management-signature":
      return {
        key: `${baseKey}:sign`,
        limit: 5,
        windowMs: 300000,
        message: "Quá nhiều yêu cầu ký xác nhận",
      };
    case "signature-progress":
      return {
        key: `${baseKey}:progress`,
        limit: 120,
        windowMs: 60000,
        message: "Quá nhiều yêu cầu theo dõi tiến độ",
      };
    case "signature-history":
      return {
        key: `${baseKey}:history`,
        limit: 30,
        windowMs: 60000,
        message: "Quá nhiều yêu cầu lịch sử ký",
      };
    default:
      return {
        key: `${baseKey}:default`,
        limit: 100,
        windowMs: 60000,
        message: "Quá nhiều yêu cầu API",
      };
  }
}

export interface AuditLogEntry {
  table_name: string;
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  record_id?: string;
  old_values?: any;
  new_values?: any;
  user_id: string;
  user_role: string;
  ip_address?: string;
  user_agent?: string;
  endpoint: string;
  timestamp: string;
  success: boolean;
  error_message?: string;
}

export function createAuditLogEntry(
  request: NextRequest,
  auth: ManagementSignatureAuth,
  operation: AuditLogEntry["operation"],
  details: Partial<AuditLogEntry>,
): AuditLogEntry {
  const clientIP =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";
  const endpoint = request.nextUrl.pathname;

  return {
    table_name: details.table_name || "management_signatures",
    operation,
    record_id: details.record_id,
    old_values: details.old_values,
    new_values: details.new_values,
    user_id: auth.user.employee_id,
    user_role: auth.user.role,
    ip_address: clientIP,
    user_agent: userAgent,
    endpoint,
    timestamp: new Date().toISOString(),
    success: details.success ?? true,
    error_message: details.error_message,
    ...details,
  };
}

export async function logAuditEntry(auditEntry: AuditLogEntry): Promise<void> {
  try {
    console.log("AUDIT LOG:", JSON.stringify(auditEntry, null, 2));
  } catch (error) {
    console.error("Failed to log audit entry:", error);
  }
}

export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    return input.trim().replace(/[<>]/g, "").substring(0, 1000);
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeInput(value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return input;
}

export function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!origin && !referer) {
    return false;
  }

  const allowedOrigins = ["http://localhost:3000", "https://localhost:3000"];

  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }

  if (
    referer &&
    !allowedOrigins.some((allowed) => referer.startsWith(allowed))
  ) {
    return false;
  }

  return true;
}

export function validateContentType(
  request: NextRequest,
  expectedType: string = "application/json",
): boolean {
  const contentType = request.headers.get("content-type");
  if (!contentType) return false;

  return contentType.includes(expectedType);
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRequestSecurity(
  request: NextRequest,
): SecurityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!validateRequestOrigin(request)) {
    errors.push("Invalid request origin");
  }

  if (request.method === "POST" && !validateContentType(request)) {
    errors.push("Invalid content type");
  }

  const userAgent = request.headers.get("user-agent");
  if (!userAgent || userAgent.length < 10) {
    warnings.push("Suspicious user agent");
  }

  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    errors.push("Missing or invalid authorization header");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export const SIGNATURE_PERMISSIONS = {
  VIEW_SIGNATURE_STATUS: "VIEW_SIGNATURE_STATUS",
  CREATE_MANAGEMENT_SIGNATURE: "CREATE_MANAGEMENT_SIGNATURE",
  VIEW_SIGNATURE_PROGRESS: "VIEW_SIGNATURE_PROGRESS",
  VIEW_SIGNATURE_HISTORY: "VIEW_SIGNATURE_HISTORY",
  VIEW_ALL_SIGNATURES: "VIEW_ALL_SIGNATURES",
  DELETE_SIGNATURE: "DELETE_SIGNATURE",
} as const;

export function hasSignaturePermission(
  auth: ManagementSignatureAuth,
  permission: keyof typeof SIGNATURE_PERMISSIONS,
): boolean {
  switch (permission) {
    case "VIEW_SIGNATURE_STATUS":
    case "VIEW_SIGNATURE_PROGRESS":
    case "VIEW_SIGNATURE_HISTORY":
      return auth.canAccessSignatureHistory();

    case "CREATE_MANAGEMENT_SIGNATURE":
      return ["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(
        auth.user.role,
      );

    case "VIEW_ALL_SIGNATURES":
    case "DELETE_SIGNATURE":
      return auth.user.role === "admin";

    default:
      return false;
  }
}
