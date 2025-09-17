import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyEmployeeManagementAccess } from "@/lib/auth-middleware"
import { cascadeUpdateEmployeeId } from "@/lib/cascade-update-employee"
import { auditService } from "@/lib/audit-service"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = verifyEmployeeManagementAccess(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { employee_id, full_name, cccd, password, chuc_vu, department, phone_number, is_active } = body

    if (!employee_id || !full_name || !chuc_vu) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 })
    }

    // Validate CCCD format if provided
    if (cccd && !/^\d{12}$/.test(cccd)) {
      return NextResponse.json({ error: "CCCD phải có đúng 12 chữ số" }, { status: 400 })
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 })
    }

    // Validate employee_id format
    if (!/^[A-Za-z0-9]+$/.test(employee_id)) {
      return NextResponse.json({ error: "Mã nhân viên chỉ được chứa chữ và số" }, { status: 400 })
    }

    const validRoles = ["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong", "to_truong", "nhan_vien", "van_phong"]
    if (!validRoles.includes(chuc_vu)) {
      return NextResponse.json({ error: "Chức vụ không hợp lệ" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Check if current employee exists and get current data for audit
    const { data: existing } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, phone_number, is_active")
      .eq("employee_id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 })
    }

    // If employee_id is changing, use cascade update
    if (employee_id !== id) {
      console.log(`Employee ID changing: ${id} → ${employee_id}`)

      // Perform cascade update across all related tables
      const cascadeResult = await cascadeUpdateEmployeeId(
        id,
        employee_id,
        admin.employee_id,
        admin.full_name || admin.employee_id
      )

      if (!cascadeResult.success) {
        return NextResponse.json({
          error: cascadeResult.message,
          details: cascadeResult.error
        }, { status: 400 })
      }

      // Update other fields if needed (after cascade update)
      const updateData: any = {
        full_name,
        chuc_vu,
        department: department || null,
        phone_number: phone_number || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      }

      if (cccd) {
        updateData.cccd_hash = await bcrypt.hash(cccd, 10)
      }

      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10)
        updateData.last_password_change_at = new Date().toISOString()
      }

      // Update additional fields (employee_id already updated by cascade)
      const { data: updatedEmployee, error: updateError } = await supabase
        .from("employees")
        .update(updateData)
        .eq("employee_id", employee_id) // Use new employee_id
        .select("employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at")
        .single()

      if (updateError) {
        console.error("Error updating additional fields:", updateError)
        return NextResponse.json({ error: "Lỗi khi cập nhật thông tin bổ sung" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        employee: updatedEmployee,
        message: `Cascade update thành công! Mã nhân viên đã được thay đổi từ ${id} thành ${employee_id}. ${cascadeResult.message}`,
        employee_id_changed: true,
        cascade_stats: cascadeResult.affectedTables
      })
    }

    // Handle normal update (employee_id not changing)
    const updateData: any = {
      full_name,
      chuc_vu,
      department: department || null,
      phone_number: phone_number || null,
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString()
    }

    if (cccd) {
      updateData.cccd_hash = await bcrypt.hash(cccd, 10)
    }

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
      updateData.last_password_change_at = new Date().toISOString()
    }

    const { data: updatedEmployee, error } = await supabase
      .from("employees")
      .update(updateData)
      .eq("employee_id", id)
      .select("employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at")
      .single()

    if (error) {
      console.error("Error updating employee:", error)

      // Log failed update
      try {
        await auditService.logFailedOperation(
          admin.employee_id,
          admin.full_name || admin.employee_id,
          id,
          'UPDATE',
          error.message
        )
      } catch (auditError) {
        console.error("Audit logging failed:", auditError)
      }

      return NextResponse.json({ error: "Lỗi khi cập nhật nhân viên" }, { status: 500 })
    }

    // Log successful update with field changes
    try {
      const changes: Array<{fieldName: string, oldValue: string, newValue: string}> = []

      if (existing.full_name !== full_name) {
        changes.push({
          fieldName: 'full_name',
          oldValue: existing.full_name || '',
          newValue: full_name
        })
      }

      if (existing.chuc_vu !== chuc_vu) {
        changes.push({
          fieldName: 'chuc_vu',
          oldValue: existing.chuc_vu || '',
          newValue: chuc_vu
        })
      }

      if (existing.department !== (department || null)) {
        changes.push({
          fieldName: 'department',
          oldValue: existing.department || '',
          newValue: department || ''
        })
      }

      if (existing.phone_number !== (phone_number || null)) {
        changes.push({
          fieldName: 'phone_number',
          oldValue: existing.phone_number || '',
          newValue: phone_number || ''
        })
      }

      if (existing.is_active !== (is_active !== undefined ? is_active : true)) {
        changes.push({
          fieldName: 'is_active',
          oldValue: existing.is_active ? 'true' : 'false',
          newValue: (is_active !== undefined ? is_active : true) ? 'true' : 'false'
        })
      }

      if (cccd) {
        changes.push({
          fieldName: 'password',
          oldValue: '[HIDDEN]',
          newValue: '[CHANGED]'
        })
      }

      if (changes.length > 0) {
        await auditService.logEmployeeUpdate(
          admin.employee_id,
          admin.full_name || admin.employee_id,
          id,
          updatedEmployee.full_name,
          changes,
          'Employee information updated via admin panel'
        )
      }
    } catch (auditError) {
      console.error("Audit logging failed:", auditError)
      // Don't fail the main operation if audit logging fails
    }

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: "Cập nhật nhân viên thành công",
      employee_id_changed: false
    })

  } catch (error) {
    console.error("Employee PUT error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = verifyEmployeeManagementAccess(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const supabase = createServiceClient()

    const { data: existing } = await supabase
      .from("employees")
      .select("employee_id, full_name")
      .eq("employee_id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 })
    }

    const { data: payrollCheck } = await supabase
      .from("payrolls")
      .select("id")
      .eq("employee_id", id)
      .limit(1)

    if (payrollCheck && payrollCheck.length > 0) {
      const { error: updateError } = await supabase
        .from("employees")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("employee_id", id)

      if (updateError) {
        console.error("Error deactivating employee:", updateError)

        // Log failed deactivation
        try {
          await auditService.logFailedOperation(
            admin.employee_id,
            admin.full_name || admin.employee_id,
            id,
            'DEACTIVATE',
            updateError.message
          )
        } catch (auditError) {
          console.error("Audit logging failed:", auditError)
        }

        return NextResponse.json({ error: "Lỗi khi vô hiệu hóa nhân viên" }, { status: 500 })
      }

      // Log successful deactivation
      try {
        await auditService.logEmployeeChange({
          adminUserId: admin.employee_id,
          adminUserName: admin.full_name || admin.employee_id,
          employeeId: id,
          employeeName: existing.full_name,
          actionType: 'DEACTIVATE',
          fieldName: 'is_active',
          oldValue: 'true',
          newValue: 'false',
          changeReason: 'Employee deactivated due to existing payroll data'
        })
      } catch (auditError) {
        console.error("Audit logging failed:", auditError)
      }

      return NextResponse.json({
        success: true,
        message: "Nhân viên đã được vô hiệu hóa (có dữ liệu lương liên quan)"
      })
    } else {
      const { error: deleteError } = await supabase
        .from("employees")
        .delete()
        .eq("employee_id", id)

      if (deleteError) {
        console.error("Error deleting employee:", deleteError)

        // Log failed deletion
        try {
          await auditService.logFailedOperation(
            admin.employee_id,
            admin.full_name || admin.employee_id,
            id,
            'DELETE',
            deleteError.message
          )
        } catch (auditError) {
          console.error("Audit logging failed:", auditError)
        }

        return NextResponse.json({ error: "Lỗi khi xóa nhân viên" }, { status: 500 })
      }

      // Log successful deletion
      try {
        await auditService.logEmployeeChange({
          adminUserId: admin.employee_id,
          adminUserName: admin.full_name || admin.employee_id,
          employeeId: id,
          employeeName: existing.full_name,
          actionType: 'DELETE',
          changeReason: 'Employee permanently deleted (no payroll data)'
        })
      } catch (auditError) {
        console.error("Audit logging failed:", auditError)
      }

      return NextResponse.json({
        success: true,
        message: "Xóa nhân viên thành công"
      })
    }

  } catch (error) {
    console.error("Employee DELETE error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = verifyEmployeeManagementAccess(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const supabase = createServiceClient()

    const { data: employee, error } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at")
      .eq("employee_id", id)
      .single()

    if (error || !employee) {
      return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      employee
    })

  } catch (error) {
    console.error("Employee GET by ID error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
