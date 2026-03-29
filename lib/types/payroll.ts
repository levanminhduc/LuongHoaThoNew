export interface PayrollResult {
  employee_id: string;
  full_name: string;
  cccd: string;
  position: string;
  department?: string;
  salary_month: string;
  salary_month_display?: string;
  total_income: number;
  deductions: number;
  net_salary: number;
  source_file: string;
  payroll_type?: string;
  must_change_password?: boolean;

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
  tien_tang_ca_vuot?: number;
  tien_luong_chu_nhat?: number;
  luong_cnkcp_vuot?: number;

  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  pc_luong?: number;
  pc_luong_cho_viec?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;

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

  chi_dot_1_13?: number;
  chi_dot_2_13?: number;
  tong_luong_13?: number;
  so_thang_chia_13?: number;
  tong_sp_12_thang?: number;

  t13_thang_01?: number;
  t13_thang_02?: number;
  t13_thang_03?: number;
  t13_thang_04?: number;
  t13_thang_05?: number;
  t13_thang_06?: number;
  t13_thang_07?: number;
  t13_thang_08?: number;
  t13_thang_09?: number;
  t13_thang_10?: number;
  t13_thang_11?: number;
  t13_thang_12?: number;

  is_signed?: boolean;
  signed_at?: string;
  signed_at_display?: string;
  signed_by_name?: string;
}
