/**
 * Utility functions to transform payroll data between different formats
 * Used for converting PayrollRecord from API to PayrollResult for modal display
 */

// PayrollRecord interface from API /api/payroll/my-department
interface PayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;

  // Hệ số và thông số cơ bản
  he_so_lam_viec?: number;
  he_so_phu_cap_ket_qua?: number;
  he_so_luong_co_ban?: number;
  luong_toi_thieu_cty?: number;

  // Thời gian làm việc
  ngay_cong_trong_gio?: number;
  gio_cong_tang_ca?: number;
  gio_an_ca?: number;
  tong_gio_lam_viec?: number;
  tong_he_so_quy_doi?: number;
  ngay_cong_chu_nhat?: number;

  // Lương sản phẩm và đơn giá
  tong_luong_san_pham_cong_doan?: number;
  don_gia_tien_luong_tren_gio?: number;
  tien_luong_san_pham_trong_gio?: number;
  tien_luong_tang_ca?: number;
  tien_luong_30p_an_ca?: number;
  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  pc_luong_cho_viec?: number;
  tien_tang_ca_vuot?: number;
  luong_cnkcp_vuot?: number;
  tien_luong_chu_nhat?: number;

  // Bảo hiểm và phúc lợi
  bhxh_21_5_percent?: number;
  pc_cdcs_pccc_atvsv?: number;
  luong_phu_nu_hanh_kinh?: number;
  tien_con_bu_thai_7_thang?: number;
  ho_tro_gui_con_nha_tre?: number;

  // Phép và lễ
  ngay_cong_phep_le?: number;
  tien_phep_le?: number;

  // Tổng lương và phụ cấp khác
  tong_cong_tien_luong?: number;
  tien_boc_vac?: number;
  ho_tro_xang_xe?: number;

  // Thuế và khấu trừ
  thue_tncn_nam_2024?: number;
  tam_ung?: number;
  thue_tncn?: number;
  bhxh_bhtn_bhyt_total?: number;
  truy_thu_the_bhyt?: number;

  // Lương thực nhận
  tien_luong_thuc_nhan_cuoi_ky?: number;

  // Thông tin ký nhận
  is_signed: boolean;
  signed_at: string | null;
  signed_by_name?: string;

  // Employee relationship
  employees: {
    employee_id?: string;
    full_name: string;
    department?: string;
    chuc_vu: string;
  };
}

// PayrollResult interface for PayrollDetailModal
interface PayrollResult {
  employee_id: string;
  full_name: string;
  cccd: string;
  position: string;
  salary_month: string;
  salary_month_display?: string;
  total_income: number;
  deductions: number;
  net_salary: number;
  source_file: string;

  // All the same payroll fields as PayrollRecord
  he_so_lam_viec?: number;
  he_so_phu_cap_ket_qua?: number;
  he_so_luong_co_ban?: number;
  luong_toi_thieu_cty?: number;
  ngay_cong_trong_gio?: number;
  gio_cong_tang_ca?: number;
  gio_an_ca?: number;
  tong_gio_lam_viec?: number;
  tong_he_so_quy_doi?: number;
  ngay_cong_chu_nhat?: number;
  tong_luong_san_pham_cong_doan?: number;
  don_gia_tien_luong_tren_gio?: number;
  tien_luong_san_pham_trong_gio?: number;
  tien_luong_tang_ca?: number;
  tien_luong_30p_an_ca?: number;
  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  pc_luong_cho_viec?: number;
  tien_tang_ca_vuot?: number;
  luong_cnkcp_vuot?: number;
  tien_luong_chu_nhat?: number;
  bhxh_21_5_percent?: number;
  pc_cdcs_pccc_atvsv?: number;
  luong_phu_nu_hanh_kinh?: number;
  tien_con_bu_thai_7_thang?: number;
  ho_tro_gui_con_nha_tre?: number;
  ngay_cong_phep_le?: number;
  tien_phep_le?: number;
  tong_cong_tien_luong?: number;
  tien_boc_vac?: number;
  ho_tro_xang_xe?: number;
  thue_tncn_nam_2024?: number;
  tam_ung?: number;
  thue_tncn?: number;
  bhxh_bhtn_bhyt_total?: number;
  truy_thu_the_bhyt?: number;
  tien_luong_thuc_nhan_cuoi_ky?: number;
  is_signed?: boolean;
  signed_at?: string;
  signed_by_name?: string;
}

/**
 * Transform PayrollRecord from API to PayrollResult format for PayrollDetailModal
 * @param payrollRecord - PayrollRecord from /api/payroll/my-department
 * @returns PayrollResult compatible with PayrollDetailModal
 */
export function transformPayrollRecordToResult(
  payrollRecord: PayrollRecord,
): PayrollResult {
  // Calculate derived values
  const totalIncome = payrollRecord.tong_cong_tien_luong || 0;
  const deductions =
    (payrollRecord.thue_tncn || 0) +
    (payrollRecord.bhxh_bhtn_bhyt_total || 0) +
    (payrollRecord.tam_ung || 0) +
    (payrollRecord.truy_thu_the_bhyt || 0);
  const netSalary = payrollRecord.tien_luong_thuc_nhan_cuoi_ky || 0;

  return {
    // Basic employee info
    employee_id: payrollRecord.employee_id,
    full_name: payrollRecord.employees?.full_name || "",
    cccd: "", // Not available in PayrollRecord, will be empty
    position: payrollRecord.employees?.chuc_vu || "",
    salary_month: payrollRecord.salary_month,

    // Calculated summary values
    total_income: totalIncome,
    deductions: deductions,
    net_salary: netSalary,
    source_file: "Supervisor Dashboard", // Indicate source

    // Copy all payroll detail fields
    he_so_lam_viec: payrollRecord.he_so_lam_viec,
    he_so_phu_cap_ket_qua: payrollRecord.he_so_phu_cap_ket_qua,
    he_so_luong_co_ban: payrollRecord.he_so_luong_co_ban,
    luong_toi_thieu_cty: payrollRecord.luong_toi_thieu_cty,
    ngay_cong_trong_gio: payrollRecord.ngay_cong_trong_gio,
    gio_cong_tang_ca: payrollRecord.gio_cong_tang_ca,
    gio_an_ca: payrollRecord.gio_an_ca,
    tong_gio_lam_viec: payrollRecord.tong_gio_lam_viec,
    tong_he_so_quy_doi: payrollRecord.tong_he_so_quy_doi,
    ngay_cong_chu_nhat: payrollRecord.ngay_cong_chu_nhat,
    tong_luong_san_pham_cong_doan: payrollRecord.tong_luong_san_pham_cong_doan,
    don_gia_tien_luong_tren_gio: payrollRecord.don_gia_tien_luong_tren_gio,
    tien_luong_san_pham_trong_gio: payrollRecord.tien_luong_san_pham_trong_gio,
    tien_luong_tang_ca: payrollRecord.tien_luong_tang_ca,
    tien_luong_30p_an_ca: payrollRecord.tien_luong_30p_an_ca,
    tien_khen_thuong_chuyen_can: payrollRecord.tien_khen_thuong_chuyen_can,
    luong_hoc_viec_pc_luong: payrollRecord.luong_hoc_viec_pc_luong,
    tong_cong_tien_luong_san_pham: payrollRecord.tong_cong_tien_luong_san_pham,
    ho_tro_thoi_tiet_nong: payrollRecord.ho_tro_thoi_tiet_nong,
    bo_sung_luong: payrollRecord.bo_sung_luong,
    tien_tang_ca_vuot: payrollRecord.tien_tang_ca_vuot,
    luong_cnkcp_vuot: payrollRecord.luong_cnkcp_vuot,
    tien_luong_chu_nhat: payrollRecord.tien_luong_chu_nhat,
    bhxh_21_5_percent: payrollRecord.bhxh_21_5_percent,
    pc_cdcs_pccc_atvsv: payrollRecord.pc_cdcs_pccc_atvsv,
    luong_phu_nu_hanh_kinh: payrollRecord.luong_phu_nu_hanh_kinh,
    tien_con_bu_thai_7_thang: payrollRecord.tien_con_bu_thai_7_thang,
    ho_tro_gui_con_nha_tre: payrollRecord.ho_tro_gui_con_nha_tre,
    ngay_cong_phep_le: payrollRecord.ngay_cong_phep_le,
    tien_phep_le: payrollRecord.tien_phep_le,
    tong_cong_tien_luong: payrollRecord.tong_cong_tien_luong,
    tien_boc_vac: payrollRecord.tien_boc_vac,
    ho_tro_xang_xe: payrollRecord.ho_tro_xang_xe,
    thue_tncn_nam_2024: payrollRecord.thue_tncn_nam_2024,
    tam_ung: payrollRecord.tam_ung,
    thue_tncn: payrollRecord.thue_tncn,
    bhxh_bhtn_bhyt_total: payrollRecord.bhxh_bhtn_bhyt_total,
    truy_thu_the_bhyt: payrollRecord.truy_thu_the_bhyt,
    tien_luong_thuc_nhan_cuoi_ky: payrollRecord.tien_luong_thuc_nhan_cuoi_ky,
    is_signed: payrollRecord.is_signed,
    signed_at: payrollRecord.signed_at || undefined,
    signed_by_name: payrollRecord.signed_by_name,
  };
}

export type { PayrollRecord, PayrollResult };
