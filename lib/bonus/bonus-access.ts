import { type NextRequest } from "next/server";
import {
  verifyToken,
  getDepartmentFilter,
  type AuthContext,
} from "@/lib/auth-middleware";

export const BONUS_VIEWER_ROLES = [
  "admin",
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
  "truong_phong",
  "to_truong",
] as const;

export type BonusViewerResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; status: 401 | 403; error: string };

export function verifyBonusViewer(request: NextRequest): BonusViewerResult {
  const auth = verifyToken(request);
  if (!auth) {
    return { ok: false, status: 401, error: "Phiên đăng nhập đã hết hạn" };
  }
  if (!(BONUS_VIEWER_ROLES as readonly string[]).includes(auth.user.role)) {
    return { ok: false, status: 403, error: "Không có quyền truy cập" };
  }
  return { ok: true, auth };
}

export function resolveAllowedDepartments(
  auth: AuthContext,
  requestedDepartment: string | null,
): string[] | null {
  const isAdmin = auth.user.role === "admin";
  const permittedDepartments = getDepartmentFilter(auth);

  if (!requestedDepartment) {
    return isAdmin ? null : permittedDepartments;
  }

  if (isAdmin || permittedDepartments.includes(requestedDepartment)) {
    return [requestedDepartment];
  }
  return [];
}
