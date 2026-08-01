import crypto from "crypto";

export function hashClientIp(ip: string, salt: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + salt)
    .digest("hex")
    .substring(0, 16);
}
