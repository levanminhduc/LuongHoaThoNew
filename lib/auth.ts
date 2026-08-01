import "server-only";
import bcrypt from "bcryptjs";
import { verifyEmployeeCredential } from "@/lib/auth/employee-credential";
import { createServiceClient } from "@/utils/supabase/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { BCRYPT_ROUNDS } from "@/lib/constants/security";

// Enhanced JWT payload interface
export interface JWTPayload {
  username: string;
  employee_id: string;
  full_name?: string;
  role:
    | "admin"
    | "giam_doc"
    | "ke_toan"
    | "nguoi_lap_bieu"
    | "truong_phong"
    | "to_truong"
    | "nhan_vien"
    | "van_phong";
  department: string;
  allowed_departments?: string[]; // For truong_phong
  permissions: string[];
  iat: number;
  exp: number;
}

// User authentication result
export interface AuthResult {
  success: boolean;
  user?: {
    employee_id: string;
    username: string;
    role: string;
    department: string;
    allowed_departments?: string[];
    permissions: string[];
  };
  error?: string;
}

// Admin user interface for database
export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export type AdminCredentialRecord = Pick<
  AdminUser,
  "id" | "username" | "password_hash"
>;

const ADMIN_CREDENTIAL_SELECT = "id, username, password_hash";

/**
 * Verify admin credentials from admin_users table
 * @param username Admin username
 * @param password Plain text password
 * @returns Promise<AdminCredentialRecord | null>
 */
export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<AdminCredentialRecord | null> {
  // SECURITY BLOCK: Reject 'admin' username completely
  if (username.toLowerCase() === "admin") {
    console.error(
      `🚫 SECURITY BLOCK: Admin credentials check blocked for username 'admin'`,
    );
    return null;
  }

  try {
    const supabase = createServiceClient();

    const { data: admin, error } = await supabase
      .from("admin_users")
      .select(ADMIN_CREDENTIAL_SELECT)
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (error || !admin) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    await supabase
      .from("admin_users")
      .update({ last_login: getVietnamTimestamp() })
      .eq("id", admin.id);

    return admin;
  } catch (error) {
    console.error("Error verifying admin credentials:", error);
    return null;
  }
}

// Enhanced authentication function for role-based login
export async function authenticateUser(
  username: string,
  password: string,
): Promise<AuthResult> {
  try {
    // SECURITY BLOCK: Completely reject 'admin' username
    if (username.toLowerCase() === "admin") {
      console.error(
        `🚫 SECURITY BLOCK: Login attempt with blocked username 'admin'`,
      );
      return {
        success: false,
        error: "Tài khoản không tồn tại",
      };
    }

    const supabase = createServiceClient();

    // Check admin_users table
    const adminUser = await verifyAdminCredentials(username, password);
    if (adminUser) {
      return {
        success: true,
        user: {
          employee_id: "admin",
          username: adminUser.username,
          role: "admin",
          department: "ALL",
          permissions: ["ALL"],
        },
      };
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .select(
        "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at",
      )
      .eq("employee_id", username)
      .eq("is_active", true)
      .single();

    if (error || !employee) {
      return {
        success: false,
        error: "Tên đăng nhập không tồn tại hoặc tài khoản đã bị khóa",
      };
    }

    const isPasswordValid = await verifyEmployeeCredential(employee, password);

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Mật khẩu không đúng",
      };
    }

    // Get department permissions for roles that can have department access
    let allowed_departments: string[] = [];
    if (
      ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
        employee.chuc_vu,
      )
    ) {
      const { data: permissions } = await supabase
        .from("department_permissions")
        .select("department")
        .eq("employee_id", employee.employee_id)
        .eq("is_active", true);

      allowed_departments = permissions?.map((p) => p.department) || [];
    }

    // Determine permissions based on role
    const permissions = getPermissionsByRole(employee.chuc_vu);

    return {
      success: true,
      user: {
        employee_id: employee.employee_id,
        username: employee.full_name,
        role: employee.chuc_vu,
        department: employee.department,
        allowed_departments:
          allowed_departments.length > 0 ? allowed_departments : undefined,
        permissions,
      },
    };
  } catch (error) {
    console.error("Error authenticating user:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi đăng nhập",
    };
  }
}

// Get permissions based on role
function getPermissionsByRole(role: string): string[] {
  switch (role) {
    case "admin":
      return ["ALL"];
    case "giam_doc":
      return [
        "VIEW_PAYROLL",
        "VIEW_EMPLOYEES",
        "VIEW_REPORTS",
        "EXPORT_DATA",
        "VIEW_FINANCIAL",
        "APPROVE_PAYROLL",
        "MANAGE_DEPARTMENTS",
      ];
    case "ke_toan":
      return [
        "VIEW_PAYROLL",
        "VIEW_FINANCIAL",
        "EXPORT_DATA",
        "MANAGE_PAYROLL",
        "VIEW_REPORTS",
      ];
    case "nguoi_lap_bieu":
      return [
        "VIEW_PAYROLL",
        "VIEW_EMPLOYEES",
        "VIEW_REPORTS",
        "EXPORT_DATA",
        "CREATE_REPORTS",
      ];
    case "truong_phong":
      return ["VIEW_PAYROLL", "VIEW_EMPLOYEES", "VIEW_REPORTS", "EXPORT_DATA"];
    case "to_truong":
      return ["VIEW_PAYROLL", "VIEW_EMPLOYEES", "VIEW_REPORTS"];
    case "nhan_vien":
      return ["VIEW_OWN_PAYROLL"];
    case "van_phong":
      return [
        "VIEW_EMPLOYEES",
        "MANAGE_EMPLOYEES",
        "VIEW_REPORTS",
        "EXPORT_DATA",
      ];
    default:
      return [];
  }
}

/**
 * Create a new admin user (for admin management)
 * @param username Admin username
 * @param password Plain text password
 * @param role Admin role (default: 'admin')
 * @returns Promise<boolean> Success status
 */
export async function createAdminUser(
  username: string,
  password: string,
  role: string = "admin",
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert new admin user
    const { error } = await supabase.from("admin_users").insert({
      username,
      password_hash,
      role,
      is_active: true,
    });

    if (error) {
      console.error("Error creating admin user:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating admin user:", error);
    return false;
  }
}
