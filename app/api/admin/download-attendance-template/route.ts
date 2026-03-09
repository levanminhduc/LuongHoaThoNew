import { type NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { verifyToken } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const daysInMonth = 31;
    const headerRow: Array<string | number> = ["Mã Nhân Viên", "Tháng"];

    for (let day = 1; day <= daysInMonth; day++) {
      headerRow.push(day, "");
    }

    headerRow.push(
      "Tổng Giờ Công",
      "Tổng Ngày Công",
      "Tổng Giờ Ăn TC",
      "Tổng Giờ Tăng Ca",
      "Nghỉ Ốm",
    );

    const buildEmployeeRows = (
      employeeId: string,
      month: string,
      values: Array<{
        checkIn: string;
        checkOut: string;
        workingUnits: number;
        overtimeUnits: number;
      }>,
      summary: {
        totalHours: number;
        totalDays: number;
        totalMealOtHours: number;
        totalOtHours: number;
        sickDays: number;
      },
    ): [(string | number)[], (string | number)[]] => {
      const row1: Array<string | number> = [employeeId, month];
      const row2: Array<string | number> = ["", ""];

      for (let day = 0; day < daysInMonth; day++) {
        const value = values[day];
        row1.push(value?.checkIn || "", value?.checkOut || "");
        row2.push(
          value ? value.workingUnits : "",
          value ? value.overtimeUnits : "",
        );
      }

      row1.push(
        summary.totalHours,
        summary.totalDays,
        summary.totalMealOtHours,
        summary.totalOtHours,
        summary.sickDays,
      );
      row2.push("", "", "", "", "");

      return [row1, row2];
    };

    const employee1Rows = buildEmployeeRows(
      "NV001",
      "2024-01",
      [
        {
          checkIn: "07:30",
          checkOut: "17:00",
          workingUnits: 1,
          overtimeUnits: 0,
        },
        {
          checkIn: "07:28",
          checkOut: "19:15",
          workingUnits: 1,
          overtimeUnits: 2,
        },
        {
          checkIn: "07:35",
          checkOut: "17:05",
          workingUnits: 1,
          overtimeUnits: 0,
        },
      ],
      {
        totalHours: 24,
        totalDays: 3,
        totalMealOtHours: 0.5,
        totalOtHours: 2,
        sickDays: 0,
      },
    );

    const employee2Rows = buildEmployeeRows(
      "NV002",
      "2024-01",
      [
        {
          checkIn: "07:45",
          checkOut: "17:10",
          workingUnits: 1,
          overtimeUnits: 0,
        },
        {
          checkIn: "07:40",
          checkOut: "20:00",
          workingUnits: 1,
          overtimeUnits: 2.5,
        },
      ],
      {
        totalHours: 16,
        totalDays: 2,
        totalMealOtHours: 0.5,
        totalOtHours: 2.5,
        sickDays: 0,
      },
    );

    const data = [
      headerRow,
      employee1Rows[0],
      employee1Rows[1],
      employee2Rows[0],
      employee2Rows[1],
    ];

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(data);

    const merges: XLSX.Range[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const startCol = 2 + (day - 1) * 2;
      merges.push({
        s: { r: 0, c: startCol },
        e: { r: 0, c: startCol + 1 },
      });
    }

    for (const startRow of [1, 3]) {
      merges.push({
        s: { r: startRow, c: 0 },
        e: { r: startRow + 1, c: 0 },
      });
      merges.push({
        s: { r: startRow, c: 1 },
        e: { r: startRow + 1, c: 1 },
      });
      const summaryStartCol = 2 + daysInMonth * 2;
      for (let offset = 0; offset < 5; offset++) {
        merges.push({
          s: { r: startRow, c: summaryStartCol + offset },
          e: { r: startRow + 1, c: summaryStartCol + offset },
        });
      }
    }

    sheet["!merges"] = merges;
    sheet["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      ...Array.from({ length: daysInMonth * 2 }, () => ({ wch: 6 })),
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, "Cham Cong Mau");

    const guideSheet = XLSX.utils.aoa_to_sheet([
      ["Hướng dẫn"],
      ["Mỗi nhân viên gồm 2 dòng liên tiếp"],
      ["Dòng trên: giờ vào và giờ ra"],
      ["Dòng dưới: công chuẩn và công tăng ca"],
      ["Cột Tháng dùng định dạng YYYY-MM hoặc MM-YYYY"],
      ["Không đổi tên các header ở dòng đầu tiên"],
      ["Có thể để trống các ngày không có dữ liệu"],
    ]);
    guideSheet["!cols"] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, "Huong Dan");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template-import-cham-cong.xlsx"',
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download attendance template error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tạo file template" },
      { status: 500 },
    );
  }
}
