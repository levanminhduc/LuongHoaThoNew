// Enhanced authentication middleware for role-based access control
import { type NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { type JWTPayload } from "@/lib/auth"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

export interface AuthContext {
  user: JWTPayload
  hasPermission: (permission: string) => boolean
  canAccessDepartment: (department: string) => boolean
  isRole: (role: string) => boolean
}

// Enhanced token verification with role support
export function verifyToken(request: NextRequest): AuthContext | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    
    return {
      user: decoded,
      hasPermission: (permission: string) => {
        if (decoded.permissions.includes('ALL')) return true
        return decoded.permissions.includes(permission)
      },
      canAccessDepartment: (department: string) => {
        if (decoded.role === 'admin') return true
        if (decoded.role === 'giam_doc') return true
        if (decoded.role === 'ke_toan') return true
        if (decoded.role === 'nguoi_lap_bieu') return true
        if (decoded.role === 'van_phong') return true
        if (decoded.role === 'truong_phong') {
          return decoded.allowed_departments?.includes(department) || false
        }
        if (decoded.role === 'to_truong') {
          return decoded.department === department
        }
        return false
      },
      isRole: (role: string) => decoded.role === role
    }
  } catch {
    return null
  }
}

// Role-based authorization middleware
export function requireRole(allowedRoles: string[]) {
  return (request: NextRequest): AuthContext | null => {
    const auth = verifyToken(request)
    if (!auth || !allowedRoles.includes(auth.user.role)) {
      return null
    }
    return auth
  }
}

// Permission-based authorization middleware
export function requirePermission(requiredPermission: string) {
  return (request: NextRequest): AuthContext | null => {
    const auth = verifyToken(request)
    if (!auth || !auth.hasPermission(requiredPermission)) {
      return null
    }
    return auth
  }
}

// Department access authorization middleware
export function requireDepartmentAccess(department: string) {
  return (request: NextRequest): AuthContext | null => {
    const auth = verifyToken(request)
    if (!auth || !auth.canAccessDepartment(department)) {
      return null
    }
    return auth
  }
}

// Admin-only authorization (backward compatibility)
export function verifyAdminToken(request: NextRequest): any {
  const auth = verifyToken(request)
  return auth?.isRole('admin') ? auth.user : null
}

// Audit logs authorization (admin only)
export function verifyAuditLogsAccess(request: NextRequest): any {
  const auth = verifyToken(request)
  return auth?.isRole('admin') ? auth.user : null
}

// Employee Management authorization (admin and van_phong)
export function verifyEmployeeManagementAccess(request: NextRequest): any {
  const auth = verifyToken(request)
  if (!auth) return null

  const allowedRoles = ['admin', 'van_phong']
  return allowedRoles.includes(auth.user.role) ? auth.user : null
}

// Multi-role authorization helper
export function authorizeRoles(request: NextRequest, allowedRoles: string[]): AuthContext | null {
  const auth = verifyToken(request)
  if (!auth || !allowedRoles.includes(auth.user.role)) {
    return null
  }
  return auth
}

// Department-filtered data access helper
export function getDepartmentFilter(auth: AuthContext): string[] {
  switch (auth.user.role) {
    case 'admin':
      return [] // No filter - access all
    case 'truong_phong':
      return auth.user.allowed_departments || []
    case 'to_truong':
      return [auth.user.department]
    case 'nhan_vien':
      return [] // Will be filtered by employee_id instead
    default:
      return []
  }
}

// Employee access filter helper
export function getEmployeeFilter(auth: AuthContext): string | null {
  if (auth.user.role === 'nhan_vien') {
    return auth.user.employee_id
  }
  return null // No employee filter for other roles
}

// Audit logging helper
export function getAuditInfo(request: NextRequest, auth: AuthContext) {
  return {
    user_id: auth.user.employee_id,
    user_role: auth.user.role,
    ip_address: request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    request_method: request.method,
    request_url: request.url
  }
}
