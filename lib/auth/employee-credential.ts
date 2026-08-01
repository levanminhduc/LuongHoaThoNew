import bcrypt from "bcryptjs";

export interface EmployeeCredentialColumns {
  cccd_hash: string | null;
  password_hash: string | null;
  last_password_change_at: string | null;
}

export function hasChangedPassword(
  employee: Pick<EmployeeCredentialColumns, "last_password_change_at">,
): boolean {
  return employee.last_password_change_at !== null;
}

export function selectCredentialHash(
  employee: EmployeeCredentialColumns,
): string | null {
  return hasChangedPassword(employee)
    ? employee.password_hash
    : employee.cccd_hash;
}

export async function verifyEmployeeCredential(
  employee: EmployeeCredentialColumns,
  plainCredential: string,
): Promise<boolean> {
  const hash = selectCredentialHash(employee);
  return hash ? bcrypt.compare(plainCredential, hash) : false;
}
