import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { parseExcelFile, type PayrollData } from "@/lib/excel-parser"
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

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const formData = await request.formData()
    const files: File[] = []

    // Collect all files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "Không có file nào được upload" }, { status: 400 })
    }

    const supabase = createServiceClient()
    let totalRecords = 0
    const allPayrollData: PayrollData[] = []

    // Process each file
    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const payrollData = parseExcelFile(buffer, file.name)
        allPayrollData.push(...payrollData)
        totalRecords += payrollData.length
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        return NextResponse.json(
          { error: `Lỗi khi xử lý file ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 400 },
        )
      }
    }

    if (allPayrollData.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu hợp lệ để import" }, { status: 400 })
    }

    // Insert data into Supabase
    const { data, error } = await supabase.from("payrolls").insert(allPayrollData).select()

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json({ error: "Lỗi khi lưu dữ liệu vào database" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Upload thành công",
      totalRecords,
      filesProcessed: files.length,
      insertedRecords: data?.length || 0,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi upload file" }, { status: 500 })
  }
}
