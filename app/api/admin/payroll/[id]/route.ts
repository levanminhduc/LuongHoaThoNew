import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.role === "admin" ? decoded : null
  } catch {
    return null
  }
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return "unknown"
}

// GET single payroll record with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const payrollId = parseInt(params.id)
    if (isNaN(payrollId)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get payroll record with employee info
    const { data: payrollData, error: payrollError } = await supabase
      .from("payrolls")
      .select(`
        *,
        employees!inner(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `)
      .eq("id", payrollId)
      .single()

    if (payrollError || !payrollData) {
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi lương" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      payroll: payrollData
    })

  } catch (error) {
    console.error("Get payroll error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy thông tin lương" },
      { status: 500 }
    )
  }
}

// PUT update payroll record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const payrollId = parseInt(params.id)
    if (isNaN(payrollId)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 })
    }

    const { updates, changeReason } = await request.json()

    if (!updates || !changeReason) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu cập nhật hoặc lý do thay đổi" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const clientIP = getClientIP(request)

    // Get current payroll data for audit trail
    const { data: currentData, error: getCurrentError } = await supabase
      .from("payrolls")
      .select("*")
      .eq("id", payrollId)
      .single()

    if (getCurrentError || !currentData) {
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi lương" },
        { status: 404 }
      )
    }

    // Validate updates (basic validation)
    const validatedUpdates: any = {}
    const auditLogs: any[] = []

    // List of editable fields (exclude metadata)
    const editableFields = [
      "he_so_lam_viec", "he_so_phu_cap_ket_qua", "he_so_luong_co_ban", "luong_toi_thieu_cty",
      "ngay_cong_trong_gio", "gio_cong_tang_ca", "gio_an_ca", "tong_gio_lam_viec", "tong_he_so_quy_doi",
      "ngay_cong_chu_nhat", // Bổ sung cột mới
      "tong_luong_san_pham_cong_doan", "don_gia_tien_luong_tren_gio", "tien_luong_san_pham_trong_gio",
      "tien_luong_tang_ca", "tien_luong_30p_an_ca", "tien_khen_thuong_chuyen_can", "luong_hoc_viec_pc_luong",
      "tong_cong_tien_luong_san_pham", "ho_tro_thoi_tiet_nong", "bo_sung_luong",
      "tien_luong_chu_nhat", "luong_cnkcp_vuot", "tien_tang_ca_vuot", // Bổ sung 3 cột mới
      "bhxh_21_5_percent", "pc_cdcs_pccc_atvsv", "luong_phu_nu_hanh_kinh", "tien_con_bu_thai_7_thang", "ho_tro_gui_con_nha_tre",
      "ngay_cong_phep_le", "tien_phep_le", "tong_cong_tien_luong", "tien_boc_vac", "ho_tro_xang_xe",
      "thue_tncn_nam_2024", "tam_ung", "thue_tncn", "bhxh_bhtn_bhyt_total", "truy_thu_the_bhyt",
      "tien_luong_thuc_nhan_cuoi_ky"
    ]

    for (const [field, newValue] of Object.entries(updates)) {
      if (!editableFields.includes(field)) {
        continue // Skip non-editable fields
      }

      const oldValue = currentData[field]
      
      // Only update if value actually changed
      if (oldValue !== newValue) {
        validatedUpdates[field] = newValue
        
        // Prepare audit log entry
        auditLogs.push({
          payroll_id: payrollId,
          employee_id: currentData.employee_id,
          salary_month: currentData.salary_month,
          changed_by: admin.username,
          change_ip: clientIP,
          change_reason: changeReason,
          field_name: field,
          old_value: String(oldValue || ""),
          new_value: String(newValue || "")
        })
      }
    }

    if (Object.keys(validatedUpdates).length === 0) {
      return NextResponse.json(
        { error: "Không có thay đổi nào để cập nhật" },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    validatedUpdates.updated_at = new Date().toISOString()

    // Update payroll record
    const { data: updatedData, error: updateError } = await supabase
      .from("payrolls")
      .update(validatedUpdates)
      .eq("id", payrollId)
      .select()
      .single()

    if (updateError) {
      console.error("Update payroll error:", updateError)
      return NextResponse.json(
        { error: "Lỗi khi cập nhật dữ liệu lương" },
        { status: 500 }
      )
    }

    // Insert audit logs
    if (auditLogs.length > 0) {
      const { error: auditError } = await supabase
        .from("payroll_audit_logs")
        .insert(auditLogs)

      if (auditError) {
        console.error("Audit log error:", auditError)
        // Don't fail the update, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cập nhật dữ liệu lương thành công",
      payroll: updatedData,
      changesCount: auditLogs.length
    })

  } catch (error) {
    console.error("Update payroll error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi cập nhật dữ liệu lương" },
      { status: 500 }
    )
  }
}
