import XLSX from "xlsx-js-style";
import { formatAttendanceSigningDate } from "@/lib/utils/signing-date-generator";
import {
  getSignatureStatus,
  type AttendanceSheetContext,
} from "@/lib/excel/attendance-sheet-types";

export function buildAttendanceSummarySheet(
  context: AttendanceSheetContext,
): XLSX.WorkSheet {
  const { monthlyData, employeeMap, signatureLogsMap, salaryMonth } = context;

  const summaryHeaders = [
    "STT",
    "Mã NV",
    "Họ Tên",
    "Phòng Ban",
    "Chức Vụ",
    "Tổng Giờ Công",
    "Tổng Ngày Công",
    "Giờ Ăn TC",
    "Giờ Tăng Ca",
    "Nghỉ Ốm",
    "File Nguồn",
    "Ký Tên",
    "Ngày Ký",
  ];

  const summaryRows = monthlyData.map((m, idx) => {
    const emp = employeeMap.get(m.employee_id);
    const signatureLog = signatureLogsMap.get(m.employee_id);

    return [
      idx + 1,
      m.employee_id,
      emp?.full_name || "",
      emp?.department || "",
      emp?.chuc_vu || "",
      m.total_hours,
      m.total_days,
      m.total_meal_ot_hours,
      m.total_ot_hours,
      m.sick_days,
      m.source_file || "",
      getSignatureStatus(signatureLog),
      formatAttendanceSigningDate(
        m.employee_id,
        salaryMonth,
        signatureLog?.signed_at || null,
      ),
    ];
  });

  const summarySheet = XLSX.utils.aoa_to_sheet([
    summaryHeaders,
    ...summaryRows,
  ]);
  summarySheet["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
    { wch: 20 },
    { wch: 12 },
  ];

  return summarySheet;
}
