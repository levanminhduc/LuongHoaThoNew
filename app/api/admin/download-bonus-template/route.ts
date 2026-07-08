import { type NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { verifyToken } from "@/lib/auth-middleware";

const TEMPLATE_HEADERS = [
  "Mã NV",
  "Loại Thưởng",
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tổng Thưởng",
];

const EXAMPLE_ROWS = [
  ["NV001", "Thưởng Quý", 1500000, 1500000, 1600000, 1600000, 1700000, 1700000, 9600000],
  ["NV002", "Thưởng Quý", 1200000, 1200000, 1200000, 1300000, 1300000, 1300000, 7500000],
];

const COLUMN_WIDTHS = [
  { wch: 12 },
  { wch: 14 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 14 },
];

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...EXAMPLE_ROWS]);
    sheet["!cols"] = COLUMN_WIDTHS;
    XLSX.utils.book_append_sheet(workbook, sheet, "Tien Thuong Mau");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template-import-tien-thuong.xlsx"',
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download bonus template error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tạo file template" },
      { status: 500 },
    );
  }
}
