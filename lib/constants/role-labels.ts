export const ROLE_LABELS = {
  admin: "Admin",
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
  truong_phong: "Trưởng Phòng",
  to_truong: "Tổ Trưởng",
  nhan_vien: "Nhân Viên",
  van_phong: "Văn Phòng",
} as const;

export function getRoleLabel(chuc_vu: string): string {
  return ROLE_LABELS[chuc_vu as keyof typeof ROLE_LABELS] ?? chuc_vu;
}

const ROLE_ORDER = Object.keys(ROLE_LABELS);

export function getRoleRank(chuc_vu: string): number {
  const index = ROLE_ORDER.indexOf(chuc_vu);
  return index === -1 ? ROLE_ORDER.length : index;
}
