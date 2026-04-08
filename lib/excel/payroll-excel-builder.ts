import XLSX from "xlsx-js-style";

export const PAYROLL_FIELDS = [
  "employee_id",
  "salary_month",
  "he_so_lam_viec",
  "he_so_phu_cap_ket_qua",
  "he_so_luong_co_ban",
  "luong_toi_thieu_cty",
  "ngay_cong_trong_gio",
  "gio_cong_tang_ca",
  "gio_an_ca",
  "tong_gio_lam_viec",
  "tong_he_so_quy_doi",
  "ngay_cong_chu_nhat",
  "tong_luong_san_pham_cong_doan",
  "don_gia_tien_luong_tren_gio",
  "tien_luong_san_pham_trong_gio",
  "tien_luong_tang_ca",
  "tien_luong_30p_an_ca",
  "tien_khen_thuong_chuyen_can",
  "luong_hoc_viec_pc_luong",
  "tong_cong_tien_luong_san_pham",
  "ho_tro_thoi_tiet_nong",
  "bo_sung_luong",
  "pc_luong_cho_viec",
  "tien_luong_chu_nhat",
  "luong_cnkcp_vuot",
  "tien_tang_ca_vuot",
  "bhxh_21_5_percent",
  "pc_cdcs_pccc_atvsv",
  "luong_phu_nu_hanh_kinh",
  "tien_con_bu_thai_7_thang",
  "ho_tro_gui_con_nha_tre",
  "ngay_cong_phep_le",
  "tien_phep_le",
  "tong_cong_tien_luong",
  "tien_boc_vac",
  "ho_tro_xang_xe",
  "thue_tncn_nam_2024",
  "tam_ung",
  "thue_tncn",
  "bhxh_bhtn_bhyt_total",
  "truy_thu_the_bhyt",
  "tien_luong_thuc_nhan_cuoi_ky",
] as const;

export type PayrollField = (typeof PAYROLL_FIELDS)[number];

export const FIELD_HEADERS: Record<string, string> = {
  employee_id: "Mã Nhân Viên",
  salary_month: "Họ Và Tên",
  he_so_lam_viec: "Hệ Số Làm Việc",
  he_so_phu_cap_ket_qua: "Hệ Số Phụ Cấp Kết Quả",
  he_so_luong_co_ban: "Hệ Số Lương Cơ Bản",
  luong_toi_thieu_cty: "Lương Tối Thiểu Công Ty",
  ngay_cong_trong_gio: "Ngày Công Trong Giờ",
  gio_cong_tang_ca: "Giờ Công Tăng Ca",
  gio_an_ca: "Giờ Ăn Ca",
  tong_gio_lam_viec: "Tổng Giờ Làm Việc",
  tong_he_so_quy_doi: "Tổng Hệ Số Quy Đổi",
  ngay_cong_chu_nhat: "Ngày Công Chủ Nhật",
  tong_luong_san_pham_cong_doan: "Tổng Lương Sản Phẩm Công Đoàn",
  don_gia_tien_luong_tren_gio: "Đơn Giá Tiền Lương Trên Giờ",
  tien_luong_san_pham_trong_gio: "Tiền Lương Sản Phẩm Trong Giờ",
  tien_luong_tang_ca: "Tiền Lương Tăng Ca",
  tien_luong_30p_an_ca: "Tiền Lương 30p Ăn Ca",
  tien_khen_thuong_chuyen_can: "Tiền Khen Thưởng Chuyên Cần",
  luong_hoc_viec_pc_luong: "Lương Học Việc PC Lương",
  tong_cong_tien_luong_san_pham: "Tổng Cộng Tiền Lương Sản Phẩm",
  ho_tro_thoi_tiet_nong: "Hỗ Trợ Thời Tiết Nóng",
  bo_sung_luong: "Bổ Sung Lương",
  pc_luong_cho_viec: "PC Lương Cho Việc",
  tien_luong_chu_nhat: "Tiền Lương Chủ Nhật",
  luong_cnkcp_vuot: "Lương CNKCP Vượt",
  tien_tang_ca_vuot: "Tiền Tăng Ca Vượt",
  bhxh_21_5_percent: "BHXH 21.5%",
  pc_cdcs_pccc_atvsv: "PC CDCS PCCC ATVSV",
  luong_phu_nu_hanh_kinh: "Lương Phụ Nữ Hành Kinh",
  tien_con_bu_thai_7_thang: "Tiền Con Bú Thai 7 Tháng",
  ho_tro_gui_con_nha_tre: "Hỗ Trợ Gửi Con Nhà Trẻ",
  ngay_cong_phep_le: "Ngày Công Phép Lễ",
  tien_phep_le: "Tiền Phép Lễ",
  tong_cong_tien_luong: "Tổng Cộng Tiền Lương",
  tien_boc_vac: "Tiền Bốc Vác",
  ho_tro_xang_xe: "Hỗ Trợ Xăng Xe",
  thue_tncn_nam_2024: "Thuế TNCN Năm 2024",
  tam_ung: "Tạm Ứng",
  thue_tncn: "Thuế TNCN",
  bhxh_bhtn_bhyt_total: "BHXH BHTN BHYT Total",
  truy_thu_the_bhyt: "Truy Thu Thẻ BHYT",
  tien_luong_thuc_nhan_cuoi_ky: "Tiền Lương Thực Nhận Cuối Kỳ",
};

export const HIDDEN_FIELDS = new Set([
  "ngay_cong_chu_nhat",
  "pc_luong_cho_viec",
  "tien_luong_chu_nhat",
  "luong_cnkcp_vuot",
  "tien_tang_ca_vuot",
  "ho_tro_xang_xe",
  "tam_ung",
]);

export const VISIBLE_FIELDS = PAYROLL_FIELDS.filter(
  (f) => !HIDDEN_FIELDS.has(f),
);

const borderStyle = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};

export const CELL_STYLES = {
  header: {
    font: {
      bold: true,
      color: { rgb: "000000" },
      sz: 11,
      name: "Times New Roman",
    },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: borderStyle,
  },
  data: {
    font: { sz: 12, name: "Times New Roman" },
    alignment: { horizontal: "left", vertical: "center", wrapText: false },
    border: borderStyle,
  },
  number: {
    font: { sz: 12, name: "Times New Roman" },
    alignment: { horizontal: "right", vertical: "center" },
    border: borderStyle,
    numFmt: "#,##0",
  },
  heSo: {
    font: { sz: 12, name: "Times New Roman" },
    alignment: { horizontal: "right", vertical: "center" },
    border: borderStyle,
    numFmt: "#,##0.00",
  },
  ngayGio: {
    font: { sz: 12, name: "Times New Roman" },
    alignment: { horizontal: "right", vertical: "center" },
    border: borderStyle,
    numFmt: "#,##0.0",
  },
  title: {
    font: { bold: true, sz: 14 },
    alignment: { horizontal: "left", vertical: "center" },
  },
  signatureHeader: {
    font: { bold: true, sz: 14, name: "Times New Roman" },
    alignment: { horizontal: "center", vertical: "center" },
  },
  signatureData: {
    font: { bold: true, sz: 14, name: "Times New Roman" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  },
  signatureDate: {
    font: { italic: true, sz: 11, name: "Times New Roman" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  },
};

const HESO_FIELDS = new Set([
  "he_so_lam_viec",
  "he_so_phu_cap_ket_qua",
  "he_so_luong_co_ban",
  "tong_he_so_quy_doi",
]);

const NGAYGIO_FIELDS = new Set([
  "ngay_cong_trong_gio",
  "gio_cong_tang_ca",
  "gio_an_ca",
  "tong_gio_lam_viec",
  "tien_con_bu_thai_7_thang",
  "ngay_cong_phep_le",
]);

const NARROW_FIELDS = new Set([
  "he_so_lam_viec",
  "he_so_phu_cap_ket_qua",
  "he_so_luong_co_ban",
  "tong_he_so_quy_doi",
  "ngay_cong_trong_gio",
  "gio_cong_tang_ca",
  "gio_an_ca",
  "tong_gio_lam_viec",
  "tien_con_bu_thai_7_thang",
  "ngay_cong_phep_le",
]);

export function getDataCellStyle(field: string, isTotal: boolean) {
  const totalFill = { patternType: "solid", fgColor: { rgb: "FFE699" } };
  const isNumeric = !["employee_id", "salary_month"].includes(field);

  if (!isNumeric) {
    return isTotal
      ? {
          ...CELL_STYLES.data,
          font: { ...CELL_STYLES.data.font, bold: true },
          fill: totalFill,
        }
      : CELL_STYLES.data;
  }

  let base: Record<string, unknown>;
  if (HESO_FIELDS.has(field)) {
    base = { ...CELL_STYLES.heSo };
  } else if (NGAYGIO_FIELDS.has(field)) {
    base = { ...CELL_STYLES.ngayGio };
  } else {
    base = { ...CELL_STYLES.number };
  }

  if (isTotal) {
    base.font = { ...(base.font as object), bold: true };
    base.fill = totalFill;
  }
  return base;
}

export function getColumnWidths(
  headers: string[],
  nameColIndex: number,
  maxNameLength: number,
) {
  const employeeIdHeader = FIELD_HEADERS["employee_id"] || "employee_id";
  const narrowHeaders = new Set(
    Array.from(NARROW_FIELDS).map((f) => FIELD_HEADERS[f] || f),
  );

  return headers.map((header, idx) => {
    if (header === "STT") return { wch: 5 };
    if (header === "Ký Tên") return { wch: 8 };
    if (header === "Phòng Ban") return { wch: 20 };
    if (header === employeeIdHeader) return { wch: 10 };
    if (idx === nameColIndex) return { wch: Math.ceil(maxNameLength * 1.2) };
    if (narrowHeaders.has(header)) return { wch: 7 };
    return { wch: 12 };
  });
}

export function formatSignedAtDate(signedAt: string | null): string {
  if (!signedAt) return "";
  try {
    const date = new Date(signedAt);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

export function formatSignedAtDateTime(signedAt: string | null): string {
  if (!signedAt) return "";
  try {
    const date = new Date(signedAt);
    if (isNaN(date.getTime())) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `Đã Ký\n${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

export function getSignatureColumns(totalColumns: number) {
  const span = 6;
  const center = Math.floor(totalColumns / 2);
  return {
    left: 0,
    center: center - Math.floor(span / 2),
    right: totalColumns - span,
  };
}

export function getSignatureMergeRanges(
  sigRows: number[],
  totalColumns: number,
) {
  const span = 6;
  const cols = getSignatureColumns(totalColumns);
  const merges: Array<{
    s: { r: number; c: number };
    e: { r: number; c: number };
  }> = [];
  for (const row of sigRows) {
    merges.push(
      { s: { r: row, c: cols.left }, e: { r: row, c: cols.left + span - 1 } },
      {
        s: { r: row, c: cols.center },
        e: { r: row, c: cols.center + span - 1 },
      },
      { s: { r: row, c: cols.right }, e: { r: row, c: cols.right + span - 1 } },
    );
  }
  return merges;
}

export function applyWorksheetStyles(
  worksheet: XLSX.WorkSheet,
  headers: string[],
  headerRowIndex: number,
  dataRowCount: number,
  rowOffset: number = 0,
) {
  const absHeader = headerRowIndex + rowOffset;
  const absTotalRow = absHeader + dataRowCount;
  const colCount = headers.length;

  for (let row = rowOffset; row <= absTotalRow; row++) {
    for (let col = 0; col < colCount; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });

      if (row < absHeader) {
        if (
          worksheet[cellRef] &&
          worksheet[cellRef].v !== "" &&
          worksheet[cellRef].v !== null &&
          worksheet[cellRef].v !== undefined
        ) {
          worksheet[cellRef].s = CELL_STYLES.title;
        } else {
          delete worksheet[cellRef];
        }
      } else if (row === absHeader) {
        if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
        worksheet[cellRef].s = CELL_STYLES.header;
      } else {
        if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
        const headerText = headers[col];
        const field =
          Object.entries(FIELD_HEADERS).find(
            ([, v]) => v === headerText,
          )?.[0] ?? headerText;
        const isTotal = row === absTotalRow;
        worksheet[cellRef].s = getDataCellStyle(field, isTotal);
      }
    }
  }
}
