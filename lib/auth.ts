import bcrypt from "bcryptjs"
import { createServiceClient } from "@/utils/supabase/server"

// Enhanced user credentials structure
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123",
}

// Enhanced JWT payload interface
export interface JWTPayload {
  username: string
  employee_id: string
  role: 'admin' | 'truong_phong' | 'to_truong' | 'nhan_vien'
  department: string
  allowed_departments?: string[] // For truong_phong
  permissions: string[]
  iat: number
  exp: number
}

// User authentication result
export interface AuthResult {
  success: boolean
  user?: {
    employee_id: string
    username: string
    role: string
    department: string
    allowed_departments?: string[]
    permissions: string[]
  }
  error?: string
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  // Sử dụng hardcoded credentials hoặc kiểm tra từ database
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return true
  }

  // Hoặc kiểm tra từ database
  try {
    const supabase = createServiceClient()
    const { data: admin } = await supabase.from("admin_users").select("password_hash").eq("username", username).single()

    if (admin) {
      return await bcrypt.compare(password, admin.password_hash)
    }
  } catch (error) {
    console.error("Error verifying admin credentials:", error)
  }

  return false
}

// Enhanced authentication function for role-based login
export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  try {
    const supabase = createServiceClient()

    // Check if admin login
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      return {
        success: true,
        user: {
          employee_id: 'admin',
          username: 'admin',
          role: 'admin',
          department: 'ALL',
          permissions: ['ALL']
        }
      }
    }

    // Test accounts for demo purposes
    const testAccounts = {
      'TP001': { password: 'truongphong123', role: 'truong_phong', department: 'Hoàn Thành', name: 'Nguyễn Văn A', allowed_departments: ['Hoàn Thành', 'KCS'] },
      'TT001': { password: 'totruong123', role: 'to_truong', department: 'Hoàn Thành', name: 'Trần Thị B' },
      'NV001': { password: 'nhanvien123', role: 'nhan_vien', department: 'Hoàn Thành', name: 'Lê Văn C' }
    }

    // Check test accounts first
    if (testAccounts[username as keyof typeof testAccounts]) {
      const testAccount = testAccounts[username as keyof typeof testAccounts]
      if (password === testAccount.password) {
        return {
          success: true,
          user: {
            employee_id: username,
            username: testAccount.name,
            role: testAccount.role,
            department: testAccount.department,
            allowed_departments: testAccount.allowed_departments,
            permissions: getPermissionsByRole(testAccount.role)
          }
        }
      }
    }

    // Check employee login from database
    const { data: employee, error } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, cccd_hash")
      .eq("employee_id", username)
      .eq("is_active", true)
      .single()

    if (error || !employee) {
      return {
        success: false,
        error: "Tên đăng nhập không tồn tại hoặc tài khoản đã bị khóa"
      }
    }

    // Verify password (using CCCD as password, hashed)
    const isPasswordValid = await bcrypt.compare(password, employee.cccd_hash)

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Mật khẩu không đúng"
      }
    }

    // Get department permissions for roles that can have department access
    let allowed_departments: string[] = []
    if (['giam_doc', 'ke_toan', 'nguoi_lap_bieu', 'truong_phong'].includes(employee.chuc_vu)) {
      const { data: permissions } = await supabase
        .from("department_permissions")
        .select("department")
        .eq("employee_id", employee.employee_id)
        .eq("is_active", true)

      allowed_departments = permissions?.map(p => p.department) || []
    }

    // Determine permissions based on role
    const permissions = getPermissionsByRole(employee.chuc_vu)

    return {
      success: true,
      user: {
        employee_id: employee.employee_id,
        username: employee.full_name,
        role: employee.chuc_vu,
        department: employee.department,
        allowed_departments: allowed_departments.length > 0 ? allowed_departments : undefined,
        permissions
      }
    }

  } catch (error) {
    console.error("Error authenticating user:", error)
    return {
      success: false,
      error: "Có lỗi xảy ra khi đăng nhập"
    }
  }
}

// Get permissions based on role
function getPermissionsByRole(role: string): string[] {
  switch (role) {
    case 'admin':
      return ['ALL']
    case 'giam_doc':
      return ['VIEW_PAYROLL', 'VIEW_EMPLOYEES', 'VIEW_REPORTS', 'EXPORT_DATA', 'VIEW_FINANCIAL', 'APPROVE_PAYROLL', 'MANAGE_DEPARTMENTS']
    case 'ke_toan':
      return ['VIEW_PAYROLL', 'VIEW_FINANCIAL', 'EXPORT_DATA', 'MANAGE_PAYROLL', 'VIEW_REPORTS']
    case 'nguoi_lap_bieu':
      return ['VIEW_PAYROLL', 'VIEW_EMPLOYEES', 'VIEW_REPORTS', 'EXPORT_DATA', 'CREATE_REPORTS']
    case 'truong_phong':
      return ['VIEW_PAYROLL', 'VIEW_EMPLOYEES', 'VIEW_REPORTS', 'EXPORT_DATA']
    case 'to_truong':
      return ['VIEW_PAYROLL', 'VIEW_EMPLOYEES', 'VIEW_REPORTS']
    case 'nhan_vien':
      return ['VIEW_OWN_PAYROLL']
    default:
      return []
  }
}

export async function verifyEmployeeCredentials(employeeId: string, cccd: string): Promise<any> {
  try {
    const supabase = createServiceClient()
    const { data: employee } = await supabase
      .from("payrolls")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("cccd", cccd)
      .single()

    return employee
  } catch (error) {
    console.error("Error verifying employee credentials:", error)
    return null
  }
}
