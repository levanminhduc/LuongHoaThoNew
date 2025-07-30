// API endpoints for managing department permissions for truong_phong
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware"

// GET all department permissions or permissions for specific employee
export async function GET(request: NextRequest) {
  try {
    // Only admin can manage department permissions
    const auth = verifyToken(request)
    if (!auth || !auth.isRole('admin')) {
      return NextResponse.json({ error: "Chỉ admin mới có quyền quản lý phân quyền" }, { status: 403 })
    }

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employee_id")
    const department = searchParams.get("department")
    const isActive = searchParams.get("is_active")

    let query = supabase
      .from("department_permissions")
      .select(`
        *,
        employees!department_permissions_employee_id_fkey(
          employee_id,
          full_name,
          department,
          chuc_vu
        ),
        granted_by_employee:employees!department_permissions_granted_by_fkey(
          employee_id,
          full_name
        )
      `)

    // Apply filters
    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    if (department) {
      query = query.eq("department", department)
    }

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true")
    }

    const { data: permissions, error } = await query.order("granted_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Lỗi truy vấn dữ liệu" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      permissions
    })

  } catch (error) {
    console.error("Get department permissions error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 })
  }
}

// POST create new department permission
export async function POST(request: NextRequest) {
  try {
    // Only admin can grant department permissions
    const auth = verifyToken(request)
    if (!auth || !auth.isRole('admin')) {
      return NextResponse.json({ error: "Chỉ admin mới có quyền cấp phân quyền" }, { status: 403 })
    }

    const { employee_id, department, notes } = await request.json()

    // Debug logging
    console.log("=== DEBUG DEPARTMENT PERMISSION REQUEST ===")
    console.log("Request data:", { employee_id, department, notes })
    console.log("Auth user:", auth.user)
    console.log("Auth user employee_id:", auth.user.employee_id)

    if (!employee_id || !department) {
      return NextResponse.json({
        error: "Thiếu thông tin employee_id hoặc department"
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify employee exists and is truong_phong
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id, full_name, chuc_vu")
      .eq("employee_id", employee_id)
      .eq("is_active", true)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ 
        error: "Nhân viên không tồn tại hoặc đã bị khóa" 
      }, { status: 400 })
    }

    if (!['truong_phong', 'to_truong'].includes(employee.chuc_vu)) {
      return NextResponse.json({
        error: "Chỉ có thể cấp quyền cho nhân viên có chức vụ trưởng phòng hoặc tổ trưởng"
      }, { status: 400 })
    }

    // Check if permission already exists
    const { data: existingPermission } = await supabase
      .from("department_permissions")
      .select("id, is_active")
      .eq("employee_id", employee_id)
      .eq("department", department)
      .single()

    if (existingPermission) {
      if (existingPermission.is_active) {
        return NextResponse.json({ 
          error: "Quyền truy cập department này đã được cấp cho nhân viên" 
        }, { status: 400 })
      } else {
        // Reactivate existing permission
        const { data: updatedPermission, error: updateError } = await supabase
          .from("department_permissions")
          .update({ 
            is_active: true, 
            granted_by: auth.user.employee_id,
            granted_at: new Date().toISOString(),
            notes 
          })
          .eq("id", existingPermission.id)
          .select()
          .single()

        if (updateError) {
          return NextResponse.json({ error: "Lỗi cập nhật quyền truy cập" }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: "Đã kích hoạt lại quyền truy cập department",
          permission: updatedPermission
        })
      }
    }

    // Determine granted_by value
    const grantedBy = auth.user.employee_id || 'admin'

    // Debug logging for insert
    console.log("=== DEBUG INSERT VALUES ===")
    console.log("employee_id:", employee_id)
    console.log("department:", department)
    console.log("granted_by:", grantedBy)
    console.log("notes:", notes)

    // Create new permission
    const { data: newPermission, error: insertError } = await supabase
      .from("department_permissions")
      .insert({
        employee_id,
        department,
        granted_by: grantedBy,
        notes
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)

      // Provide more specific error messages
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({
          error: "Nhân viên đã có quyền truy cập department này"
        }, { status: 400 })
      } else if (insertError.code === '23503') { // Foreign key constraint violation
        return NextResponse.json({
          error: "Dữ liệu tham chiếu không hợp lệ (employee_id hoặc granted_by)"
        }, { status: 400 })
      } else {
        return NextResponse.json({
          error: `Lỗi tạo quyền truy cập: ${insertError.message}`
        }, { status: 500 })
      }
    }

    // Log the action
    const auditInfo = getAuditInfo(request, auth)
    await supabase.rpc('log_access', {
      p_user_id: auditInfo.user_id,
      p_user_role: auditInfo.user_role,
      p_action: 'GRANT_PERMISSION',
      p_resource: 'department_permissions',
      p_department: department,
      p_employee_accessed: employee_id,
      p_ip_address: auditInfo.ip_address,
      p_user_agent: auditInfo.user_agent,
      p_request_method: auditInfo.request_method,
      p_request_url: auditInfo.request_url,
      p_response_status: 201
    })

    return NextResponse.json({
      success: true,
      message: "Đã cấp quyền truy cập department thành công",
      permission: newPermission
    }, { status: 201 })

  } catch (error) {
    console.error("Create department permission error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 })
  }
}

// DELETE revoke department permission
export async function DELETE(request: NextRequest) {
  try {
    // Only admin can revoke department permissions
    const auth = verifyToken(request)
    if (!auth || !auth.isRole('admin')) {
      return NextResponse.json({ error: "Chỉ admin mới có quyền thu hồi phân quyền" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const permissionId = searchParams.get("id")
    const employeeId = searchParams.get("employee_id")
    const department = searchParams.get("department")

    if (!permissionId && (!employeeId || !department)) {
      return NextResponse.json({ 
        error: "Cần cung cấp permission ID hoặc employee_id + department" 
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    let query = supabase.from("department_permissions")

    if (permissionId) {
      query = query.eq("id", parseInt(permissionId))
    } else {
      query = query.eq("employee_id", employeeId).eq("department", department)
    }

    // Soft delete by setting is_active = false
    const { data: revokedPermission, error } = await query
      .update({ is_active: false })
      .select()
      .single()

    if (error) {
      console.error("Revoke permission error:", error)
      return NextResponse.json({ error: "Lỗi thu hồi quyền truy cập" }, { status: 500 })
    }

    if (!revokedPermission) {
      return NextResponse.json({ error: "Không tìm thấy quyền truy cập" }, { status: 404 })
    }

    // Log the action
    const auditInfo = getAuditInfo(request, auth)
    await supabase.rpc('log_access', {
      p_user_id: auditInfo.user_id,
      p_user_role: auditInfo.user_role,
      p_action: 'REVOKE_PERMISSION',
      p_resource: 'department_permissions',
      p_department: revokedPermission.department,
      p_employee_accessed: revokedPermission.employee_id,
      p_ip_address: auditInfo.ip_address,
      p_user_agent: auditInfo.user_agent,
      p_request_method: auditInfo.request_method,
      p_request_url: auditInfo.request_url,
      p_response_status: 200
    })

    return NextResponse.json({
      success: true,
      message: "Đã thu hồi quyền truy cập department thành công",
      permission: revokedPermission
    })

  } catch (error) {
    console.error("Delete department permission error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 })
  }
}
