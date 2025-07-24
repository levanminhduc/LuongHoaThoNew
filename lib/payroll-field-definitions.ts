export interface PayrollFieldDefinition {
  field: string
  label: string
  description: string
  data_type: "text" | "number" | "date"
  is_required: boolean
  category: string
  default_value?: string | number
}

export const PAYROLL_FIELD_DEFINITIONS: PayrollFieldDefinition[] = [
  // Required fields
  {
    field: "employee_id",
    label: "Mã Nhân Viên",
    description: "Mã định danh duy nhất của nhân viên",
    data_type: "text",
    is_required: true,
    category: "Thông tin cơ bản"
  },
  {
    field: "salary_month",
    label: "Tháng Lương",
    description: "Tháng lương theo định dạng YYYY-MM",
    data_type: "text",
    is_required: true,
    category: "Thông tin cơ bản"
  },

  // Hệ số và thông số cơ bản
  {
    field: "he_so_lam_viec",
    label: "Hệ Số Làm Việc",
    description: "Hệ số làm việc của nhân viên",
    data_type: "number",
    is_required: false,
    category: "Hệ số cơ bản",
    default_value: 0
  },
  {
    field: "he_so_phu_cap_ket_qua",
    label: "Hệ Số Phụ Cấp Kết Quả",
    description: "Hệ số phụ cấp theo kết quả làm việc",
    data_type: "number",
    is_required: false,
    category: "Hệ số cơ bản",
    default_value: 0
  },
  {
    field: "he_so_luong_co_ban",
    label: "Hệ Số Lương Cơ Bản",
    description: "Hệ số lương cơ bản của nhân viên",
    data_type: "number",
    is_required: false,
    category: "Hệ số cơ bản",
    default_value: 0
  },
  {
    field: "luong_toi_thieu_cty",
    label: "Lương Tối Thiểu Công Ty",
    description: "Mức lương tối thiểu theo quy định công ty",
    data_type: "number",
    is_required: false,
    category: "Hệ số cơ bản",
    default_value: 0
  },

  // Thời gian làm việc
  {
    field: "ngay_cong_trong_gio",
    label: "Ngày Công Trong Giờ",
    description: "Số ngày công làm việc trong giờ hành chính",
    data_type: "number",
    is_required: false,
    category: "Thời gian làm việc",
    default_value: 0
  },
  {
    field: "gio_cong_tang_ca",
    label: "Giờ Công Tăng Ca",
    description: "Số giờ làm tăng ca",
    data_type: "number",
    is_required: false,
    category: "Thời gian làm việc",
    default_value: 0
  },
  {
    field: "gio_an_ca",
    label: "Giờ Ăn Ca",
    description: "Số giờ ăn ca",
    data_type: "number",
    is_required: false,
    category: "Thời gian làm việc",
    default_value: 0
  },
  {
    field: "tong_gio_lam_viec",
    label: "Tổng Giờ Làm Việc",
    description: "Tổng số giờ làm việc trong tháng",
    data_type: "number",
    is_required: false,
    category: "Thời gian làm việc",
    default_value: 0
  },
  {
    field: "tong_he_so_quy_doi",
    label: "Tổng Hệ Số Quy Đổi",
    description: "Tổng hệ số quy đổi giờ làm việc",
    data_type: "number",
    is_required: false,
    category: "Thời gian làm việc",
    default_value: 0
  },

  // Lương sản phẩm và đơn giá
  {
    field: "tong_luong_san_pham_cong_doan",
    label: "Tổng Lương Sản Phẩm Công Đoạn",
    description: "Tổng tiền lương sản phẩm theo công đoạn",
    data_type: "number",
    is_required: false,
    category: "Lương sản phẩm",
    default_value: 0
  },
  {
    field: "don_gia_tien_luong_tren_gio",
    label: "Đơn Giá Tiền Lương Trên Giờ",
    description: "Đơn giá tiền lương tính theo giờ",
    data_type: "number",
    is_required: false,
    category: "Lương sản phẩm",
    default_value: 0
  },
  {
    field: "tien_luong_san_pham_trong_gio",
    label: "Tiền Lương Sản Phẩm Trong Giờ",
    description: "Tiền lương sản phẩm làm trong giờ hành chính",
    data_type: "number",
    is_required: false,
    category: "Lương sản phẩm",
    default_value: 0
  },
  {
    field: "tien_luong_tang_ca",
    label: "Tiền Lương Tăng Ca",
    description: "Tiền lương làm tăng ca",
    data_type: "number",
    is_required: false,
    category: "Lương sản phẩm",
    default_value: 0
  },
  {
    field: "tien_luong_30p_an_ca",
    label: "Tiền Lương 30p Ăn Ca",
    description: "Tiền lương 30 phút ăn ca",
    data_type: "number",
    is_required: false,
    category: "Lương sản phẩm",
    default_value: 0
  },

  // Thưởng và phụ cấp
  {
    field: "tien_khen_thuong_chuyen_can",
    label: "Tiền Khen Thưởng Chuyên Cần",
    description: "Tiền thưởng chuyên cần",
    data_type: "number",
    is_required: false,
    category: "Thưởng và phụ cấp",
    default_value: 0
  },
  {
    field: "luong_hoc_viec_pc_luong",
    label: "Lương Học Việc PC Lương",
    description: "Lương học việc và phụ cấp lương",
    data_type: "number",
    is_required: false,
    category: "Thưởng và phụ cấp",
    default_value: 0
  },
  {
    field: "tong_cong_tien_luong_san_pham",
    label: "Tổng Cộng Tiền Lương Sản Phẩm",
    description: "Tổng cộng tiền lương sản phẩm",
    data_type: "number",
    is_required: false,
    category: "Thưởng và phụ cấp",
    default_value: 0
  },
  {
    field: "ho_tro_thoi_tiet_nong",
    label: "Hỗ Trợ Thời Tiết Nóng",
    description: "Tiền hỗ trợ làm việc trong thời tiết nóng",
    data_type: "number",
    is_required: false,
    category: "Thưởng và phụ cấp",
    default_value: 0
  },
  {
    field: "bo_sung_luong",
    label: "Bổ Sung Lương",
    description: "Tiền bổ sung lương",
    data_type: "number",
    is_required: false,
    category: "Thưởng và phụ cấp",
    default_value: 0
  },

  // Bảo hiểm và phúc lợi
  {
    field: "bhxh_21_5_percent",
    label: "BHXH 21.5%",
    description: "Bảo hiểm xã hội 21.5%",
    data_type: "number",
    is_required: false,
    category: "Bảo hiểm và phúc lợi",
    default_value: 0
  },
  {
    field: "pc_cdcs_pccc_atvsv",
    label: "PC CDCS PCCC ATVSV",
    description: "Phụ cấp chỉ đạo chỉ huy, phòng cháy chữa cháy, an toàn vệ sinh lao động",
    data_type: "number",
    is_required: false,
    category: "Bảo hiểm và phúc lợi",
    default_value: 0
  },
  {
    field: "luong_phu_nu_hanh_kinh",
    label: "Lương Phụ Nữ Hành Kinh",
    description: "Phụ cấp lương cho phụ nữ hành kinh",
    data_type: "number",
    is_required: false,
    category: "Bảo hiểm và phúc lợi",
    default_value: 0
  },
  {
    field: "tien_con_bu_thai_7_thang",
    label: "Tiền Con Bú Thai 7 Tháng",
    description: "Phụ cấp cho con bú và thai từ 7 tháng",
    data_type: "number",
    is_required: false,
    category: "Bảo hiểm và phúc lợi",
    default_value: 0
  },
  {
    field: "ho_tro_gui_con_nha_tre",
    label: "Hỗ Trợ Gửi Con Nhà Trẻ",
    description: "Hỗ trợ tiền gửi con nhà trẻ",
    data_type: "number",
    is_required: false,
    category: "Bảo hiểm và phúc lợi",
    default_value: 0
  },

  // Phép và lễ
  {
    field: "ngay_cong_phep_le",
    label: "Ngày Công Phép Lễ",
    description: "Số ngày công phép và lễ",
    data_type: "number",
    is_required: false,
    category: "Phép và lễ",
    default_value: 0
  },
  {
    field: "tien_phep_le",
    label: "Tiền Phép Lễ",
    description: "Tiền lương ngày phép và lễ",
    data_type: "number",
    is_required: false,
    category: "Phép và lễ",
    default_value: 0
  },

  // Tổng lương
  {
    field: "tong_cong_tien_luong",
    label: "Tổng Cộng Tiền Lương",
    description: "Tổng cộng tiền lương trước khấu trừ",
    data_type: "number",
    is_required: false,
    category: "Tổng lương",
    default_value: 0
  },
  {
    field: "tien_boc_vac",
    label: "Tiền Bốc Vác",
    description: "Tiền phụ cấp bốc vác",
    data_type: "number",
    is_required: false,
    category: "Tổng lương",
    default_value: 0
  },
  {
    field: "ho_tro_xang_xe",
    label: "Hỗ Trợ Xăng Xe",
    description: "Hỗ trợ tiền xăng xe",
    data_type: "number",
    is_required: false,
    category: "Tổng lương",
    default_value: 0
  },

  // Thuế và khấu trừ
  {
    field: "thue_tncn_nam_2024",
    label: "Thuế TNCN Năm 2024",
    description: "Thuế thu nhập cá nhân năm 2024",
    data_type: "number",
    is_required: false,
    category: "Thuế và khấu trừ",
    default_value: 0
  },
  {
    field: "tam_ung",
    label: "Tạm Ứng",
    description: "Số tiền tạm ứng",
    data_type: "number",
    is_required: false,
    category: "Thuế và khấu trừ",
    default_value: 0
  },
  {
    field: "thue_tncn",
    label: "Thuế TNCN",
    description: "Thuế thu nhập cá nhân",
    data_type: "number",
    is_required: false,
    category: "Thuế và khấu trừ",
    default_value: 0
  },
  {
    field: "bhxh_bhtn_bhyt_total",
    label: "BHXH BHTN BHYT Total",
    description: "Tổng bảo hiểm xã hội, thất nghiệp, y tế",
    data_type: "number",
    is_required: false,
    category: "Thuế và khấu trừ",
    default_value: 0
  },
  {
    field: "truy_thu_the_bhyt",
    label: "Truy Thu Thẻ BHYT",
    description: "Truy thu tiền thẻ bảo hiểm y tế",
    data_type: "number",
    is_required: false,
    category: "Thuế và khấu trừ",
    default_value: 0
  },

  // Lương thực nhận
  {
    field: "tien_luong_thuc_nhan_cuoi_ky",
    label: "Tiền Lương Thực Nhận Cuối Kỳ",
    description: "Số tiền lương thực nhận cuối kỳ (sau khấu trừ)",
    data_type: "number",
    is_required: false,
    category: "Lương thực nhận",
    default_value: 0
  }
]

export const PAYROLL_FIELD_CATEGORIES = [
  "Thông tin cơ bản",
  "Hệ số cơ bản", 
  "Thời gian làm việc",
  "Lương sản phẩm",
  "Thưởng và phụ cấp",
  "Bảo hiểm và phúc lợi",
  "Phép và lễ",
  "Tổng lương",
  "Thuế và khấu trừ",
  "Lương thực nhận"
]

export function getFieldsByCategory(category: string): PayrollFieldDefinition[] {
  return PAYROLL_FIELD_DEFINITIONS.filter(field => field.category === category)
}

export function getRequiredFields(): PayrollFieldDefinition[] {
  return PAYROLL_FIELD_DEFINITIONS.filter(field => field.is_required)
}

export function getFieldDefinition(fieldName: string): PayrollFieldDefinition | undefined {
  return PAYROLL_FIELD_DEFINITIONS.find(field => field.field === fieldName)
}
