import { EMPLOYEE_ROLES } from "@/lib/validations/common";

export interface PolicyActor {
  role: string;
  employeeId: string;
}

export interface PolicyTarget {
  role: string;
  employeeId: string;
}

export const MANAGEABLE_ROLES: Readonly<Record<string, readonly string[]>> = {
  admin: EMPLOYEE_ROLES,
  van_phong: ["truong_phong", "to_truong", "nhan_vien"],
  nguoi_lap_bieu: ["to_truong", "nhan_vien"],
};

const EMPLOYEE_CREATOR_ROLES = ["admin", "van_phong"];

export function getManageableRoles(role: string): readonly string[] {
  return MANAGEABLE_ROLES[role] ?? [];
}

export function canCreateEmployee(role: string): boolean {
  return EMPLOYEE_CREATOR_ROLES.includes(role);
}

export function canManageEmployee(
  actor: PolicyActor,
  target: PolicyTarget,
): boolean {
  if (actor.role === "admin") return true;
  if (actor.employeeId === target.employeeId) return false;
  return getManageableRoles(actor.role).includes(target.role);
}

export function canDeleteEmployee(
  actor: PolicyActor,
  target: PolicyTarget,
): boolean {
  return canCreateEmployee(actor.role) && canManageEmployee(actor, target);
}

export function canAssignRole(
  actor: PolicyActor,
  target: PolicyTarget | null,
  newRole: string,
): boolean {
  if (!getManageableRoles(actor.role).includes(newRole)) return false;
  return target === null || canManageEmployee(actor, target);
}
