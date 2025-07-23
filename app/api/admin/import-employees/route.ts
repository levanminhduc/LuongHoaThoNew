import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { parseEmployeeExcelFile, type EmployeeData } from "@/lib/employee-parser"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

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

// Hash CCCD for security
async function hashCCCD(cccd: string): Promise<string> {
  return await bcrypt.hash(cccd, 10)
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Không có file nào được upload" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "File không đúng định dạng. Chỉ chấp nhận file .xlsx hoặc .xls",
        },
        { status: 400 },
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "File quá lớn. Kích thước tối đa là 10MB",
        },
        { status: 400 },
      )
    }

    // Parse Excel file
    const buffer = Buffer.from(await file.arrayBuffer())
    const parseResult = parseEmployeeExcelFile(buffer, file.name)

    if (!parseResult.success && parseResult.data.length === 0) {
      return NextResponse.json(
        {
          error: "File không có dữ liệu hợp lệ",
          details: parseResult.errors,
        },
        { status: 400 },
      )
    }

    const supabase = createServiceClient()
    const successfulInserts: EmployeeData[] = []
    const insertErrors: Array<{ employee_id: string; error: string }> = []

    // Process each employee
    for (const employee of parseResult.data) {
      try {
        // Hash CCCD for security
        const cccdHash = await hashCCCD(employee.cccd)

        // Check if employee already exists
        const { data: existingEmployee } = await supabase
          .from("employees")
          .select("employee_id")
          .eq("employee_id", employee.employee_id)
          .single()

        if (existingEmployee) {
          insertErrors.push({
            employee_id: employee.employee_id,
            error: "Mã nhân viên đã tồn tại trong hệ thống",
          })
          continue
        }

        // Insert employee with exact database schema mapping
        const { data, error } = await supabase
          .from("employees")
          .insert({
            employee_id: employee.employee_id,
            full_name: employee.full_name,
            cccd_hash: cccdHash,
            department: employee.department,
            chuc_vu: employee.chuc_vu,
            phone_number: employee.phone_number || null,
            is_active: employee.is_active,
          })
          .select()
          .single()

        if (error) {
          console.error("Supabase insert error:", error)
          let errorMessage = "Lỗi database không xác định"

          // Handle specific database errors
          if (error.code === "23505") {
            // Unique constraint violation
            errorMessage = "Mã nhân viên đã tồn tại"
          } else if (error.code === "23502") {
            // Not null constraint violation
            errorMessage = "Thiếu dữ liệu bắt buộc"
          } else if (error.code === "23514") {
            // Check constraint violation
            errorMessage = "Dữ liệu không hợp lệ"
          } else if (error.message) {
            errorMessage = error.message
          }

          insertErrors.push({
            employee_id: employee.employee_id,
            error: errorMessage,
          })
        } else {
          successfulInserts.push(employee)
        }
      } catch (error) {
        console.error("Error processing employee:", employee.employee_id, error)
        insertErrors.push({
          employee_id: employee.employee_id,
          error: `Lỗi xử lý: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    }

    // Combine all errors
    const allErrors = [
      ...parseResult.errors.map((e) => ({
        employee_id: e.employee_id,
        error: `Dòng ${e.row}: ${e.error}`,
      })),
      ...insertErrors,
    ]

    // Generate success message
    let message = ""
    if (successfulInserts.length > 0 && allErrors.length === 0) {
      message = `Import hoàn tất thành công! Đã thêm ${successfulInserts.length} nhân viên vào hệ thống.`
    } else if (successfulInserts.length > 0 && allErrors.length > 0) {
      message = `Import hoàn tất với một số lỗi. Thành công: ${successfulInserts.length}, Lỗi: ${allErrors.length}. Vui lòng kiểm tra chi tiết bên dưới.`
    } else {
      message = `Import thất bại. Không có nhân viên nào được thêm vào hệ thống. Tổng lỗi: ${allErrors.length}.`
    }

    return NextResponse.json({
      success: successfulInserts.length > 0,
      message,
      totalProcessed: parseResult.totalRows,
      successCount: successfulInserts.length,
      errorCount: allErrors.length,
      errors: allErrors,
      successfulEmployees: successfulInserts.map((e) => ({
        employee_id: e.employee_id,
        full_name: e.full_name,
        department: e.department,
      })),
    })
  } catch (error) {
    console.error("Import employees error:", error)
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi import nhân viên",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
