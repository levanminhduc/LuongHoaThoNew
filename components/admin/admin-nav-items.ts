import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  ArrowUpDown,
  Database,
  UserCheck,
  Shield,
  Cog,
  KeyRound,
  Clock,
  CalendarDays,
  FileDown,
  UserSearch,
  Gift,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
  allowedRoles?: string[];
}

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },
  {
    title: "Quản Lý Nhân Viên",
    icon: Users,
    href: "/admin/employee-management",
    allowedRoles: ["admin", "van_phong", "nguoi_lap_bieu"],
  },
  {
    title: "Quản Lý Lương",
    icon: FileSpreadsheet,
    href: "/admin/payroll-management",
  },
];

export const dataManagementItems: NavItem[] = [
  {
    title: "Import Lương",
    icon: ArrowUpDown,
    href: "/admin/payroll-import-export",
  },
  {
    title: "Import Tiền Thưởng",
    icon: Gift,
    href: "/admin/bonus-import",
  },
  {
    title: "Kiểm Tra Dữ Liệu",
    icon: Database,
    href: "/admin/data-validation",
  },
  {
    title: "Ký Hàng Loạt",
    icon: UserCheck,
    href: "/admin/bulk-signature",
  },
  {
    title: "Import Chấm Công",
    icon: Clock,
    href: "/admin/attendance-import",
  },
  {
    title: "Danh Sách Chấm Công",
    icon: CalendarDays,
    href: "/admin/attendance-list",
  },
  {
    title: "Xuất Lương Toàn Bộ",
    icon: FileDown,
    href: "/admin/bulk-export",
  },
  {
    title: "Kiểm Tra NV",
    icon: UserSearch,
    href: "/admin/employee-check",
  },
];

export const adminToolsItems: NavItem[] = [
  {
    title: "Quản Lý CCCD",
    icon: KeyRound,
    href: "/admin/dashboard/update-cccd",
  },
  {
    title: "Column Mapping",
    icon: Cog,
    href: "/admin/column-mapping-config",
  },
  {
    title: "Phân Quyền",
    icon: Shield,
    href: "/admin/department-management",
  },
];

export function filterNavItemsByRole(
  items: NavItem[],
  role: string,
): NavItem[] {
  return items.filter((item) =>
    item.allowedRoles ? item.allowedRoles.includes(role) : role === "admin",
  );
}
