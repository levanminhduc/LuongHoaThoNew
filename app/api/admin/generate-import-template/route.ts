import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyAdminToken } from "@/lib/auth-middleware"
import * as XLSX from "xlsx"

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get("configId")

    if (!configId) {
      return NextResponse.json({ error: "Configuration ID là bắt buộc" }, { status: 400 })
    }

    const { data: config, error: configError } = await supabase
      .from("mapping_configurations")
      .select(`
        *,
        configuration_field_mappings (
          database_field,
          excel_column_name,
          confidence_score,
          mapping_type
        )
      `)
      .eq("id", configId)
      .eq("is_active", true)
      .single()

    if (configError || !config) {
      return NextResponse.json({ error: "Configuration không tồn tại" }, { status: 404 })
    }

    if (!config.configuration_field_mappings || config.configuration_field_mappings.length === 0) {
      return NextResponse.json({ error: "Configuration không có field mappings" }, { status: 400 })
    }

    // Get real employee IDs from database for sample data
    const { data: employees, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id")
      .limit(3)

    if (employeeError) {
      console.warn("Could not fetch employee IDs for sample data:", employeeError)
    }

    const realEmployeeIds = employees && employees.length > 0
      ? employees.map(emp => emp.employee_id)
      : ["EMP001", "EMP002", "EMP003"] // Fallback IDs if no employees found

    const headers = config.configuration_field_mappings
      .sort((a: any, b: any) => b.confidence_score - a.confidence_score)
      .map((mapping: any) => mapping.excel_column_name)

    const sampleData = [
      generateSampleRow(config.configuration_field_mappings, 1, realEmployeeIds[0] || "EMP001"),
      generateSampleRow(config.configuration_field_mappings, 2, realEmployeeIds[1] || "EMP002"),
      generateSampleRow(config.configuration_field_mappings, 3, realEmployeeIds[2] || "EMP003")
    ]

    const worksheetData = [headers, ...sampleData]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Add comment to first data cell explaining sample data
    if (worksheet['A2']) {
      worksheet['A2'].c = [{
        a: "System",
        t: "Dữ liệu mẫu sử dụng Employee IDs thực tế từ hệ thống. Vui lòng thay thế bằng dữ liệu thực tế trước khi import."
      }]
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: C })
      if (worksheet[headerCell]) {
        worksheet[headerCell].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center" }
        }
      }
    }

    worksheet['!cols'] = headers.map(() => ({ width: 20 }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Template")

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    const vietnamDate = new Date(new Date().getTime() + (7 * 60 * 60 * 1000))
    const timestamp = vietnamDate.toISOString().slice(0, 10)
    const filename = `import-template-${config.config_name.replace(/\s+/g, '-')}-${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
        "X-Config-Name": config.config_name,
        "X-Config-Id": config.id.toString(),
        "X-Field-Count": config.configuration_field_mappings.length.toString()
      },
    })

  } catch (error) {
    console.error("Generate template error:", error)
    return NextResponse.json({ error: "Lỗi khi tạo template" }, { status: 500 })
  }
}

function generateSampleRow(fieldMappings: any[], rowIndex: number, employeeId?: string): any[] {
  // Generate valid salary month (current year, previous month to avoid future dates)
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11
  const sampleMonth = currentMonth > 1 ? currentMonth - 1 : 12
  const sampleYear = currentMonth > 1 ? currentYear : currentYear - 1
  const formattedMonth = sampleMonth.toString().padStart(2, '0')

  const sampleData: Record<string, any> = {
    employee_id: employeeId || `EMP00${rowIndex}`,
    salary_month: `${sampleYear}-${formattedMonth}`,
    he_so_lam_viec: 1.0,
    he_so_phu_cap_ket_qua: 0.3,
    he_so_luong_co_ban: 2.34,
    luong_toi_thieu_cty: 4680000,
    ngay_cong_trong_gio: 22,
    gio_cong_tang_ca: 8,
    gio_an_ca: 22,
    tong_gio_lam_viec: 198,
    tong_he_so_quy_doi: 22,
    ngay_cong_chu_nhat: 4,
    tong_luong_san_pham_cong_doan: 15000000 + (rowIndex * 1000000),
    don_gia_tien_luong_tren_gio: 75757,
    tien_luong_san_pham_trong_gio: 15000000 + (rowIndex * 1000000),
    tien_luong_tang_ca: 500000 + (rowIndex * 100000),
    tien_luong_30p_an_ca: 550000,
    tien_luong_chu_nhat: 1200000,
    thuong_hieu_qua_lam_viec: 1000000,
    thuong_chuyen_can: 500000,
    thuong_khac: 300000,
    phu_cap_tien_an: 2000000,
    phu_cap_xang_xe: 500000,
    phu_cap_dien_thoai: 200000,
    phu_cap_khac: 100000,
    luong_cnkcp_vuot: 0,
    tien_tang_ca_vuot: 0,
    ngay_cong_phep_le: 1,
    tien_phep_le: 300000,
    tong_cong_tien_luong: 20000000 + (rowIndex * 2000000),
    tien_boc_vac: 0,
    ho_tro_xang_xe: 0,
    thue_tncn_nam_2024: 0,
    tam_ung: 5000000,
    thue_tncn: 800000 + (rowIndex * 100000),
    bhxh_bhtn_bhyt_total: 1500000,
    truy_thu_the_bhyt: 0,
    tien_luong_thuc_nhan_cuoi_ky: 18000000 + (rowIndex * 1800000)
  }

  return fieldMappings
    .sort((a: any, b: any) => b.confidence_score - a.confidence_score)
    .map((mapping: any) => sampleData[mapping.database_field] || "")
}
