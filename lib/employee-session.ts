import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/config/jwt";

interface EmployeeSessionPayload {
  employee_id: string;
  type: "employee_session";
  iat: number;
  exp: number;
}

const SESSION_TTL = "30m";

export function createEmployeeSession(employeeId: string): string {
  return jwt.sign(
    { employee_id: employeeId, type: "employee_session" },
    getJwtSecret(),
    { expiresIn: SESSION_TTL },
  );
}

export function verifyEmployeeSession(
  token: string,
): { employee_id: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as EmployeeSessionPayload;
    if (decoded.type !== "employee_session") return null;
    return { employee_id: decoded.employee_id };
  } catch {
    return null;
  }
}
