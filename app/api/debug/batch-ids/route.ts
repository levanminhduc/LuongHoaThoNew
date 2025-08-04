import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get recent batch IDs
    const { data: batchIds, error } = await supabase
      .from("payrolls")
      .select("import_batch_id, created_at, source_file")
      .not("import_batch_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error fetching batch IDs:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Get unique batch IDs with counts
    const batchCounts = batchIds?.reduce((acc: any, record: any) => {
      const batchId = record.import_batch_id
      if (!acc[batchId]) {
        acc[batchId] = {
          batch_id: batchId,
          count: 0,
          latest_created: record.created_at,
          source_file: record.source_file
        }
      }
      acc[batchId].count++
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      recent_batches: Object.values(batchCounts || {}),
      total_records: batchIds?.length || 0
    })

  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
