import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import jwt from "jsonwebtoken"
import { 
  type ColumnAlias, 
  type AliasSearchParams, 
  type ApiResponse 
} from "@/lib/column-alias-config"

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

// GET: Fetch column aliases with search/filter
export async function GET(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params: AliasSearchParams = {
      database_field: searchParams.get("database_field") || undefined,
      alias_name: searchParams.get("alias_name") || undefined,
      is_active: searchParams.get("is_active") === "true" ? true : 
                 searchParams.get("is_active") === "false" ? false : undefined,
      created_by: searchParams.get("created_by") || undefined,
      confidence_min: searchParams.get("confidence_min") ? 
                     parseInt(searchParams.get("confidence_min")!) : undefined,
      confidence_max: searchParams.get("confidence_max") ? 
                     parseInt(searchParams.get("confidence_max")!) : undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
      sort_by: (searchParams.get("sort_by") as any) || "alias_name",
      sort_order: (searchParams.get("sort_order") as "asc" | "desc") || "asc"
    }

    const supabase = createServiceClient()
    let query = supabase
      .from("column_aliases")
      .select("*", { count: "exact" })

    // Apply filters
    if (params.database_field) {
      query = query.eq("database_field", params.database_field)
    }
    if (params.alias_name) {
      query = query.ilike("alias_name", `%${params.alias_name}%`)
    }
    if (params.is_active !== undefined) {
      query = query.eq("is_active", params.is_active)
    }
    if (params.created_by) {
      query = query.eq("created_by", params.created_by)
    }
    if (params.confidence_min !== undefined) {
      query = query.gte("confidence_score", params.confidence_min)
    }
    if (params.confidence_max !== undefined) {
      query = query.lte("confidence_score", params.confidence_max)
    }

    // Apply sorting
    query = query.order(params.sort_by!, { ascending: params.sort_order === "asc" })

    // Apply pagination
    const from = ((params.page || 1) - 1) * (params.limit || 50)
    const to = from + (params.limit || 50) - 1
    query = query.range(from, to)

    const { data: aliases, error, count } = await query

    if (error) {
      console.error("Error fetching column aliases:", error)
      return NextResponse.json(
        { success: false, message: "Lỗi khi tải danh sách aliases" },
        { status: 500 }
      )
    }

    const response: ApiResponse<ColumnAlias[]> = {
      success: true,
      data: aliases || [],
      meta: {
        total: count || 0,
        page: params.page || 1,
        limit: params.limit || 50
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Column aliases GET error:", error)
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tải aliases" },
      { status: 500 }
    )
  }
}

// POST: Create new column alias
export async function POST(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { database_field, alias_name, confidence_score = 80 } = body

    if (!database_field || !alias_name) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin database_field hoặc alias_name" },
        { status: 400 }
      )
    }

    // Validate confidence score
    if (confidence_score < 0 || confidence_score > 100) {
      return NextResponse.json(
        { success: false, message: "Confidence score phải từ 0 đến 100" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check for duplicate alias
    const { data: existing } = await supabase
      .from("column_aliases")
      .select("id")
      .eq("database_field", database_field)
      .eq("alias_name", alias_name)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Alias này đã tồn tại cho trường database" },
        { status: 409 }
      )
    }

    // Create new alias
    const { data: newAlias, error } = await supabase
      .from("column_aliases")
      .insert({
        database_field,
        alias_name: alias_name.trim(),
        confidence_score,
        is_active: true,
        created_by: adminUser.username
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating column alias:", error)
      return NextResponse.json(
        { success: false, message: "Lỗi khi tạo alias mới" },
        { status: 500 }
      )
    }

    const response: ApiResponse<ColumnAlias> = {
      success: true,
      data: newAlias,
      message: "Tạo alias thành công"
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Column aliases POST error:", error)
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tạo alias" },
      { status: 500 }
    )
  }
}

// PUT: Bulk create aliases
export async function PUT(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { aliases } = body

    if (!Array.isArray(aliases) || aliases.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách aliases không hợp lệ" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each alias
    for (const alias of aliases) {
      try {
        const { database_field, alias_name, confidence_score = 80 } = alias

        if (!database_field || !alias_name) {
          results.errors.push(`Thiếu thông tin: ${JSON.stringify(alias)}`)
          continue
        }

        // Check for duplicate
        const { data: existing } = await supabase
          .from("column_aliases")
          .select("id")
          .eq("database_field", database_field)
          .eq("alias_name", alias_name)
          .single()

        if (existing) {
          results.skipped++
          continue
        }

        // Create alias
        const { error } = await supabase
          .from("column_aliases")
          .insert({
            database_field,
            alias_name: alias_name.trim(),
            confidence_score,
            is_active: true,
            created_by: adminUser.username
          })

        if (error) {
          results.errors.push(`Lỗi tạo alias "${alias_name}": ${error.message}`)
        } else {
          results.created++
        }

      } catch (err) {
        results.errors.push(`Lỗi xử lý alias: ${JSON.stringify(alias)}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Hoàn thành: ${results.created} tạo mới, ${results.skipped} bỏ qua`,
      data: results
    })

  } catch (error) {
    console.error("Column aliases bulk create error:", error)
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tạo bulk aliases" },
      { status: 500 }
    )
  }
}
