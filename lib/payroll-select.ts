export const PAYROLL_SELECT_CORE = `
  id,
  employee_id,
  salary_month,
  payroll_type,
  source_file,
  is_signed,
  signed_at,
  signed_by_name
`;

export const PAYROLL_SELECT_T13 = `
  id,
  employee_id,
  salary_month,
  payroll_type,
  source_file,
  is_signed,
  signed_at,
  signed_by_name,
  chi_dot_1_13,
  chi_dot_2_13,
  tong_luong_13,
  so_thang_chia_13,
  tong_sp_12_thang,
  t13_thang_01,
  t13_thang_02,
  t13_thang_03,
  t13_thang_04,
  t13_thang_05,
  t13_thang_06,
  t13_thang_07,
  t13_thang_08,
  t13_thang_09,
  t13_thang_10,
  t13_thang_11,
  t13_thang_12
`;

export const PAYROLL_SELECT_MONTHLY = `
  id,
  employee_id,
  salary_month,
  payroll_type,
  source_file,
  is_signed,
  signed_at,
  signed_by_name,
  he_so_lam_viec,
  he_so_phu_cap_ket_qua,
  he_so_luong_co_ban,
  luong_toi_thieu_cty,
  ngay_cong_trong_gio,
  gio_cong_tang_ca,
  gio_an_ca,
  tong_gio_lam_viec,
  tong_he_so_quy_doi,
  ngay_cong_chu_nhat,
  tong_luong_san_pham_cong_doan,
  don_gia_tien_luong_tren_gio,
  tien_luong_san_pham_trong_gio,
  tien_luong_tang_ca,
  tien_luong_30p_an_ca,
  tien_tang_ca_vuot,
  tien_luong_chu_nhat,
  luong_cnkcp_vuot,
  tien_khen_thuong_chuyen_can,
  luong_hoc_viec_pc_luong,
  tong_cong_tien_luong_san_pham,
  ho_tro_thoi_tiet_nong,
  bo_sung_luong,
  pc_luong_cho_viec,
  bhxh_21_5_percent,
  pc_cdcs_pccc_atvsv,
  luong_phu_nu_hanh_kinh,
  tien_con_bu_thai_7_thang,
  ho_tro_gui_con_nha_tre,
  ngay_cong_phep_le,
  tien_phep_le,
  tong_cong_tien_luong,
  tien_boc_vac,
  ho_tro_xang_xe,
  thue_tncn_nam_2024,
  tam_ung,
  thue_tncn,
  bhxh_bhtn_bhyt_total,
  truy_thu_the_bhyt,
  tien_luong_thuc_nhan_cuoi_ky
`;

export function getPayrollSelect(isT13: boolean): string {
  return isT13 ? PAYROLL_SELECT_T13 : PAYROLL_SELECT_MONTHLY;
}

export interface PayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;
  payroll_type: string | null;
  source_file: string | null;
  is_signed: boolean | null;
  signed_at: string | null;
  signed_by_name: string | null;
  chi_dot_1_13?: number | null;
  chi_dot_2_13?: number | null;
  tong_luong_13?: number | null;
  so_thang_chia_13?: number | null;
  tong_sp_12_thang?: number | null;
  t13_thang_01?: number | null;
  t13_thang_02?: number | null;
  t13_thang_03?: number | null;
  t13_thang_04?: number | null;
  t13_thang_05?: number | null;
  t13_thang_06?: number | null;
  t13_thang_07?: number | null;
  t13_thang_08?: number | null;
  t13_thang_09?: number | null;
  t13_thang_10?: number | null;
  t13_thang_11?: number | null;
  t13_thang_12?: number | null;
  he_so_lam_viec?: number | null;
  he_so_phu_cap_ket_qua?: number | null;
  he_so_luong_co_ban?: number | null;
  luong_toi_thieu_cty?: number | null;
  ngay_cong_trong_gio?: number | null;
  gio_cong_tang_ca?: number | null;
  gio_an_ca?: number | null;
  tong_gio_lam_viec?: number | null;
  tong_he_so_quy_doi?: number | null;
  ngay_cong_chu_nhat?: number | null;
  tong_luong_san_pham_cong_doan?: number | null;
  don_gia_tien_luong_tren_gio?: number | null;
  tien_luong_san_pham_trong_gio?: number | null;
  tien_luong_tang_ca?: number | null;
  tien_luong_30p_an_ca?: number | null;
  tien_tang_ca_vuot?: number | null;
  tien_luong_chu_nhat?: number | null;
  luong_cnkcp_vuot?: number | null;
  tien_khen_thuong_chuyen_can?: number | null;
  luong_hoc_viec_pc_luong?: number | null;
  tong_cong_tien_luong_san_pham?: number | null;
  ho_tro_thoi_tiet_nong?: number | null;
  bo_sung_luong?: number | null;
  pc_luong_cho_viec?: number | null;
  bhxh_21_5_percent?: number | null;
  pc_cdcs_pccc_atvsv?: number | null;
  luong_phu_nu_hanh_kinh?: number | null;
  tien_con_bu_thai_7_thang?: number | null;
  ho_tro_gui_con_nha_tre?: number | null;
  ngay_cong_phep_le?: number | null;
  tien_phep_le?: number | null;
  tong_cong_tien_luong?: number | null;
  tien_boc_vac?: number | null;
  ho_tro_xang_xe?: number | null;
  thue_tncn_nam_2024?: number | null;
  tam_ung?: number | null;
  thue_tncn?: number | null;
  bhxh_bhtn_bhyt_total?: number | null;
  truy_thu_the_bhyt?: number | null;
  tien_luong_thuc_nhan_cuoi_ky?: number | null;
}
