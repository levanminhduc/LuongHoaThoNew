import type { AuthContext } from "@/lib/auth-middleware";
import { ForbiddenError } from "@/lib/errors/app-error";

export function assertDepartmentAccess(
  auth: AuthContext,
  department: string,
): void {
  if (!auth.canAccessDepartment(department)) {
    throw new ForbiddenError("Bạn không có quyền với phòng ban này");
  }
}
