import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import bcrypt from "bcryptjs"

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Constants
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 3 // 3 attempts per minute

// Rate limiting helper
function checkRateLimit(identifier: string): { allowed: boolean; message?: string } {
  const now = Date.now()
  const limit = rateLimitMap.get(identifier)
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return { allowed: true }
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return { 
      allowed: false, 
      message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${waitTime} giây.`
    }
  }
  
  limit.count++
  return { allowed: true }
}

// Security logging helper
async function logSecurityEvent(
  supabase: any,
  employeeId: string,
  action: string,
  ipAddress: string,
  details: string
) {
  try {
    await supabase.from("security_logs").insert({
      employee_id: employeeId,
      action,
      ip_address: ipAddress,
      details,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error("Failed to log security event:", error)
    // Don't throw - logging failure shouldn't break the main flow
  }
}

export async function POST(request: NextRequest) {
  try {
    const { employee_id, current_password, new_password } = await request.json()
    
    // Get IP for rate limiting and logging
    const ip = request.headers.get("x-forwarded-for") || 
                request.headers.get("x-real-ip") || 
                "unknown"
    
    // Check rate limit
    const rateLimit = checkRateLimit(`change-pwd:${ip}:${employee_id}`)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message },
        { status: 429 }
      )
    }
    
    // Validate input
    if (!employee_id || !current_password || !new_password) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      )
    }
    
    // Password strength validation
    if (new_password.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 8 ký tự" },
        { status: 400 }
      )
    }
    
    if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có cả chữ và số" },
        { status: 400 }
      )
    }
    
    // Prevent using same password
    if (current_password === new_password) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải khác mật khẩu hiện tại" },
        { status: 400 }
      )
    }
    
    const supabase = createServiceClient()
    
    // Step 1: Get employee and check if account is locked
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*") // Select all to handle missing columns gracefully
      .eq("employee_id", employee_id.trim())
      .single()
    
    if (employeeError || !employee) {
      await logSecurityEvent(
        supabase,
        employee_id,
        "password_change_failed",
        ip,
        "Employee not found"
      )
      
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404 }
      )
    }
    
    // Check if account is locked (only if column exists)
    if (employee.locked_until !== undefined && employee.locked_until) {
      const lockExpiry = new Date(employee.locked_until)
      if (lockExpiry > new Date()) {
        const minutesLeft = Math.ceil((lockExpiry.getTime() - Date.now()) / 60000)
        
        await logSecurityEvent(
          supabase,
          employee_id,
          "password_change_blocked",
          ip,
          "Account locked"
        )
        
        return NextResponse.json(
          { error: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.` },
          { status: 423 } // Locked
        )
      }
    }
    
    // Step 2: Verify current password
    // Check password_hash first (if user already changed password), then fallback to cccd_hash
    const passwordToCheck = employee.password_hash || employee.cccd_hash
    const isValidPassword = await bcrypt.compare(current_password.trim(), passwordToCheck)
    
    if (!isValidPassword) {
      // Only track failed attempts if columns exist
      if (employee.failed_login_attempts !== undefined) {
        // Increment failed attempts
        const newFailedAttempts = (employee.failed_login_attempts || 0) + 1
        let updateData: any = { failed_login_attempts: newFailedAttempts }
        
        // Lock account if too many failures
        if (newFailedAttempts >= MAX_ATTEMPTS && employee.locked_until !== undefined) {
          updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION).toISOString()
          
          await logSecurityEvent(
            supabase,
            employee_id,
            "account_locked",
            ip,
            `Locked after ${newFailedAttempts} failed attempts`
          )
        }
        
        await supabase
          .from("employees")
          .update(updateData)
          .eq("employee_id", employee_id)
      
      await logSecurityEvent(
        supabase,
        employee_id,
        "password_change_failed",
        ip,
        `Invalid current password. Attempts: ${newFailedAttempts}`
      )
      
        return NextResponse.json(
          { 
            error: newFailedAttempts >= MAX_ATTEMPTS 
              ? "Tài khoản đã bị khóa do nhập sai quá nhiều lần"
              : `Mật khẩu hiện tại không đúng. Còn ${MAX_ATTEMPTS - newFailedAttempts} lần thử.`
          },
          { status: 401 }
        )
      } else {
        // If columns don't exist, just return error without tracking
        return NextResponse.json(
          { error: "Mật khẩu hiện tại không đúng" },
          { status: 401 }
        )
      }
    }
    
    // Step 3: Hash new password
    const saltRounds = 12 // High security
    const newPasswordHash = await bcrypt.hash(new_password.trim(), saltRounds)
    
    // Step 4: Update password and reset security fields
    // Build update object based on what columns exist
    const updateData: any = {}
    
    // Update password_hash if column exists, otherwise fallback to cccd_hash
    if (employee.password_hash !== undefined) {
      updateData.password_hash = newPasswordHash
    } else {
      updateData.cccd_hash = newPasswordHash // Fallback for old schema
    }
    
    // Only update new columns if they exist in the employee record
    if (employee.must_change_password !== undefined) {
      updateData.must_change_password = false
    }
    if (employee.password_changed_at !== undefined) {
      updateData.password_changed_at = new Date().toISOString()
    }
    if (employee.failed_login_attempts !== undefined) {
      updateData.failed_login_attempts = 0
    }
    if (employee.locked_until !== undefined) {
      updateData.locked_until = null
    }
    
    const { error: updateError } = await supabase
      .from("employees")
      .update(updateData)
      .eq("employee_id", employee_id)
    
    if (updateError) {
      console.error("Password update error:", updateError)
      
      await logSecurityEvent(
        supabase,
        employee_id,
        "password_change_error",
        ip,
        updateError.message
      )
      
      return NextResponse.json(
        { error: "Không thể cập nhật mật khẩu. Vui lòng thử lại." },
        { status: 500 }
      )
    }
    
    // Step 5: Log successful password change
    await logSecurityEvent(
      supabase,
      employee_id,
      "password_change_success",
      ip,
      employee.password_changed_at ? "Password updated" : "First-time password change from CCCD"
    )
    
    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công",
      data: {
        employee_id,
        password_changed: true,
        must_change_password: false
      }
    })
    
  } catch (error) {
    console.error("Password change error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi đổi mật khẩu" },
      { status: 500 }
    )
  }
}

// GET endpoint to check if user needs to change password
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employee_id")
    
    if (!employeeId) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên" },
        { status: 400 }
      )
    }
    
    const supabase = createServiceClient()
    
    const { data: employee, error } = await supabase
      .from("employees")
      .select("must_change_password, password_changed_at")
      .eq("employee_id", employeeId)
      .single()
    
    if (error || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      must_change_password: employee.must_change_password || !employee.password_changed_at,
      password_changed_at: employee.password_changed_at
    })
    
  } catch (error) {
    console.error("Check password status error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra" },
      { status: 500 }
    )
  }
}
