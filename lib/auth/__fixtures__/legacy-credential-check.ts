import bcrypt from "bcryptjs";
import type { EmployeeCredentialColumns } from "@/lib/auth/employee-credential";

/**
 * Bản sao nguyên văn quy tắc chọn hash trước refactor (lib/auth.ts tại aa00118~1).
 * Giữ nguyên cả việc truyền hash `null` thẳng vào bcrypt.compare.
 */
export async function legacyVerifyCredential(
  employee: EmployeeCredentialColumns,
  plainCredential: string,
): Promise<boolean> {
  const hasChangedPassword = employee.last_password_change_at !== null;
  const hashToVerify = hasChangedPassword
    ? employee.password_hash
    : employee.cccd_hash;
  return bcrypt.compare(plainCredential, hashToVerify as string);
}
