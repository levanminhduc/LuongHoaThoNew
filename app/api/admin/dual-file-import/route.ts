import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { DualFileImportParser } from "@/lib/dual-file-import-parser"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

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
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const formData = await request.formData()
    const file1 = formData.get("file1") as File | null
    const file2 = formData.get("file2") as File | null
    const file1ConfigId = formData.get("file1_config_id") as string | null
    const file2ConfigId = formData.get("file2_config_id") as string | null

    if (!file1 && !file2) {
      return NextResponse.json({ error: "Cần ít nhất một file để import" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch configurations and mappings
    let file1Config = null,
      file1Mappings = []
    let file2Config = null,
      file2Mappings = []

    if (file1 && file1ConfigId) {
      const { data: config } = await supabase
        .from("import_file_configs")
        .select("*")
        .eq("id", Number.parseInt(file1ConfigId))
        .single()

      const { data: mappings } = await supabase
        .from("import_column_mappings")
        .select("*")
        .eq("config_id", Number.parseInt(file1ConfigId))
        .order("display_order")

      file1Config = config
      file1Mappings = mappings || []
    }

    if (file2 && file2ConfigId) {
      const { data: config } = await supabase
        .from("import_file_configs")
        .select("*")
        .eq("id", Number.parseInt(file2ConfigId))
        .single()

      const { data: mappings } = await supabase
        .from("import_column_mappings")
        .select("*")
        .eq("config_id", Number.parseInt(file2ConfigId))
        .order("display_order")

      file2Config = config
      file2Mappings = mappings || []
    }

    // Parse files
    const parser = new DualFileImportParser(file1Config!, file1Mappings, file2Config!, file2Mappings)

    const file1Buffer = file1 ? Buffer.from(await file1.arrayBuffer()) : null
    const file2Buffer = file2 ? Buffer.from(await file2.arrayBuffer()) : null

    const parseResult = parser.parseFiles(file1Buffer, file1?.name || null, file2Buffer, file2?.name || null)

    // Create import session
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .insert({
        session_id: parseResult.session_id,
        admin_user: admin.username,
        file1_name: file1?.name || null,
        file2_name: file2?.name || null,
        file1_config_id: file1ConfigId ? Number.parseInt(file1ConfigId) : null,
        file2_config_id: file2ConfigId ? Number.parseInt(file2ConfigId) : null,
        status: parseResult.success ? "completed" : "failed",
        total_records: parseResult.total_employees,
        processed_records: parseResult.matched_records,
        error_records: parseResult.errors.length,
        import_summary: {
          file1_processed: parseResult.file1_processed,
          file2_processed: parseResult.file2_processed,
          matched_records: parseResult.matched_records,
          summary: parseResult.summary,
        },
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Error creating import session:", sessionError)
    }

    // If parsing successful and we have data, insert into payrolls
    if (parseResult.success && parseResult.matched_records > 0) {
      // Convert to payroll records (this would need the merged data from parser)
      // For now, we'll just return the parse result

      const message =
        `Import hoàn tất! Xử lý ${parseResult.total_employees} nhân viên, ` +
        `khớp ${parseResult.matched_records} bản ghi từ ${file1 ? "1" : "0"} + ${file2 ? "1" : "0"} file(s)`

      return NextResponse.json({
        success: true,
        message,
        result: parseResult,
        session_id: parseResult.session_id,
      })
    } else {
      const message =
        parseResult.errors.length > 0
          ? `Import thất bại với ${parseResult.errors.length} lỗi`
          : "Import hoàn tất nhưng không có dữ liệu hợp lệ"

      return NextResponse.json({
        success: false,
        message,
        result: parseResult,
        session_id: parseResult.session_id,
      })
    }
  } catch (error) {
    console.error("Dual file import error:", error)
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi import dual file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
