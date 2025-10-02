// TypeScript interfaces for Payroll Management

export interface PayrollSearchResult {
  payroll_id: number;
  employee_id: string;
  full_name: string;
  department: string;
  position: string;
  salary_month: string;
  net_salary: number;
  source_file: string;
  created_at: string;
}

export interface PayrollData {
  // Metadata
  id: number;
  employee_id: string;
  salary_month: string;
  source_file?: string;
  import_batch_id?: string;
  import_status?: string;
  created_at: string;
  updated_at: string;

  // Employee info (from join)
  employees?: {
    employee_id: string;
    full_name: string;
    department: string;
    chuc_vu: string;
  };

  // Signature info
  is_signed?: boolean;
  signed_at?: string;
  signed_by_name?: string;
  signature_ip?: string;
  signature_device?: string;

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

  // Khen thưởng và phụ cấp
  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  tien_luong_chu_nhat?: number;
  luong_cnkcp_vuot?: number;
  tien_tang_ca_vuot?: number;

  // Bảo hiểm và phụ cấp khác
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
}

export interface AuditLogEntry {
  id: number;
  changed_by: string;
  changed_at: string;
  change_ip?: string;
  change_reason: string;
  changes: {
    field_name: string;
    old_value: string;
    new_value: string;
  }[];
}

export interface PayrollFieldGroup {
  title: string;
  description: string;
  fields: PayrollField[];
}

export interface PayrollField {
  key: keyof PayrollData;
  label: string;
  type: "number" | "text" | "readonly";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  validation?: (value: any) => string | null;
}

export interface PayrollUpdateRequest {
  updates: Partial<PayrollData>;
  changeReason: string;
}

export interface PayrollUpdateResponse {
  success: boolean;
  message: string;
  payroll: PayrollData;
  changesCount: number;
}

export interface MonthOption {
  value: string;
  label: string;
}

// Field groups for organized form display
export const PAYROLL_FIELD_GROUPS: PayrollFieldGroup[] = [
  {
    title: "Hệ Số và Thông Số Cơ Bản",
    description: "Các hệ số làm việc và lương cơ bản",
    fields: [
      {
        key: "he_so_lam_viec",
        label: "Hệ Số Làm Việc",
        type: "number",
        min: 0,
        step: 0.01,
      },
      {
        key: "he_so_phu_cap_ket_qua",
        label: "Hệ Số Phụ Cấp Kết Quả",
        type: "number",
        min: 0,
        step: 0.01,
      },
      {
        key: "he_so_luong_co_ban",
        label: "Hệ Số Lương Cơ Bản",
        type: "number",
        min: 0,
        step: 0.01,
      },
      {
        key: "luong_toi_thieu_cty",
        label: "Lương Tối Thiểu Công Ty",
        type: "number",
        min: 0,
      },
    ],
  },
  {
    title: "Thời Gian Làm Việc",
    description: "Ngày công và giờ làm việc",
    fields: [
      {
        key: "ngay_cong_trong_gio",
        label: "Ngày Công Trong Giờ",
        type: "number",
        min: 0,
        step: 0.5,
      },
      {
        key: "gio_cong_tang_ca",
        label: "Giờ Công Tăng Ca",
        type: "number",
        min: 0,
        step: 0.5,
      },
      {
        key: "gio_an_ca",
        label: "Giờ Ăn Ca",
        type: "number",
        min: 0,
        step: 0.5,
      },
      {
        key: "tong_gio_lam_viec",
        label: "Tổng Giờ Làm Việc",
        type: "number",
        min: 0,
        step: 0.5,
      },
      {
        key: "tong_he_so_quy_doi",
        label: "Tổng Hệ Số Quy Đổi",
        type: "number",
        min: 0,
        step: 0.01,
      },
      {
        key: "ngay_cong_chu_nhat",
        label: "Ngày Công Chủ Nhật",
        type: "number",
        min: 0,
        step: 0.5,
      },
    ],
  },
  {
    title: "Lương Sản Phẩm",
    description: "Lương sản phẩm và đơn giá",
    fields: [
      {
        key: "tong_luong_san_pham_cong_doan",
        label: "Tổng Lương Sản Phẩm Công Đoạn",
        type: "number",
        min: 0,
      },
      {
        key: "don_gia_tien_luong_tren_gio",
        label: "Đơn Giá Tiền Lương Trên Giờ",
        type: "number",
        min: 0,
      },
      {
        key: "tien_luong_san_pham_trong_gio",
        label: "Tiền Lương Sản Phẩm Trong Giờ",
        type: "number",
        min: 0,
      },
      {
        key: "tien_luong_tang_ca",
        label: "Tiền Lương Tăng Ca",
        type: "number",
        min: 0,
      },
      {
        key: "tien_luong_30p_an_ca",
        label: "Tiền Lương 30p Ăn Ca",
        type: "number",
        min: 0,
      },
    ],
  },
  {
    title: "Khen Thưởng và Phụ Cấp",
    description: "Các khoản khen thưởng và phụ cấp",
    fields: [
      {
        key: "tien_khen_thuong_chuyen_can",
        label: "Tiền Khen Thưởng Chuyên Cần",
        type: "number",
        min: 0,
      },
      {
        key: "luong_hoc_viec_pc_luong",
        label: "Lương Học Việc PC Lương",
        type: "number",
        min: 0,
      },
      {
        key: "tong_cong_tien_luong_san_pham",
        label: "Tổng Cộng Tiền Lương Sản Phẩm",
        type: "number",
        min: 0,
      },
      {
        key: "ho_tro_thoi_tiet_nong",
        label: "Hỗ Trợ Thời Tiết Nóng",
        type: "number",
        min: 0,
      },
      { key: "bo_sung_luong", label: "Bổ Sung Lương", type: "number", min: 0 },
      {
        key: "tien_luong_chu_nhat",
        label: "Tiền Lương Chủ Nhật",
        type: "number",
        min: 0,
      },
      {
        key: "luong_cnkcp_vuot",
        label: "Lương CNKCP Vượt",
        type: "number",
        min: 0,
      },
      {
        key: "tien_tang_ca_vuot",
        label: "Tiền Tăng Ca Vượt",
        type: "number",
        min: 0,
      },
    ],
  },
  {
    title: "Bảo Hiểm và Phụ Cấp Khác",
    description: "Các khoản bảo hiểm và phụ cấp đặc biệt",
    fields: [
      { key: "bhxh_21_5_percent", label: "BHXH 21.5%", type: "number", min: 0 },
      {
        key: "pc_cdcs_pccc_atvsv",
        label: "PC CDCS PCCC ATVSV",
        type: "number",
        min: 0,
      },
      {
        key: "luong_phu_nu_hanh_kinh",
        label: "Lương Phụ Nữ Hành Kinh",
        type: "number",
        min: 0,
      },
      {
        key: "tien_con_bu_thai_7_thang",
        label: "Tiền Con Bú Thai 7 Tháng",
        type: "number",
        min: 0,
      },
      {
        key: "ho_tro_gui_con_nha_tre",
        label: "Hỗ Trợ Gửi Con Nhà Trẻ",
        type: "number",
        min: 0,
      },
    ],
  },
  {
    title: "Phép và Lễ",
    description: "Ngày phép và lễ tết",
    fields: [
      {
        key: "ngay_cong_phep_le",
        label: "Ngày Công Phép Lễ",
        type: "number",
        min: 0,
        step: 0.5,
      },
      { key: "tien_phep_le", label: "Tiền Phép Lễ", type: "number", min: 0 },
    ],
  },
  {
    title: "Tổng Lương và Phụ Cấp Khác",
    description: "Tổng các khoản lương và phụ cấp",
    fields: [
      {
        key: "tong_cong_tien_luong",
        label: "Tổng Cộng Tiền Lương",
        type: "number",
        min: 0,
      },
      { key: "tien_boc_vac", label: "Tiền Bốc Vác", type: "number", min: 0 },
      {
        key: "ho_tro_xang_xe",
        label: "Hỗ Trợ Xăng Xe",
        type: "number",
        min: 0,
      },
    ],
  },
  {
    title: "Thuế và Khấu Trừ",
    description: "Các khoản thuế và khấu trừ",
    fields: [
      {
        key: "thue_tncn_nam_2024",
        label: "Thuế TNCN Năm 2024",
        type: "number",
        min: 0,
      },
      { key: "tam_ung", label: "Tạm Ứng", type: "number", min: 0 },
      { key: "thue_tncn", label: "Thuế TNCN", type: "number", min: 0 },
      {
        key: "bhxh_bhtn_bhyt_total",
        label: "BHXH BHTN BHYT Total",
        type: "number",
        min: 0,
      },
      {
        key: "truy_thu_the_bhyt",
        label: "Truy Thu Thẻ BHYT",
        type: "number",
        min: 0,
      },
    ],
  },
  {
    title: "Lương Thực Nhận",
    description: "Số tiền lương cuối cùng nhân viên nhận được",
    fields: [
      {
        key: "tien_luong_thuc_nhan_cuoi_ky",
        label: "Tiền Lương Thực Nhận Cuối Kỳ",
        type: "number",
        min: 0,
        required: true,
      },
    ],
  },
];
