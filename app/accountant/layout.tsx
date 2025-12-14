"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  RoleSidebar,
  type RoleNavGroup,
} from "@/components/shared/role-sidebar";
import { RoleHeader } from "@/components/shared/role-header";
import { NavigationProgress } from "@/components/admin/navigation-progress";
import {
  LayoutDashboard,
  DollarSign,
  Calculator,
  Eye,
  UserX,
} from "lucide-react";

const EXCLUDED_PATHS = ["/accountant/login"];

const navGroups: RoleNavGroup[] = [
  {
    label: "Tổng Quan",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/accountant/dashboard",
      },
    ],
  },
  {
    label: "Xác Nhận Tài Chính",
    items: [
      {
        title: "Xác Nhận Lương",
        icon: DollarSign,
        href: "/accountant/dashboard",
      },
      {
        title: "Kiểm Tra Tính Toán",
        icon: Calculator,
        href: "/accountant/dashboard",
      },
    ],
  },
  {
    label: "Xem Dữ Liệu",
    items: [
      { title: "Xem Tổng Quan", icon: Eye, href: "/accountant/dashboard" },
      {
        title: "Nhân Viên Chưa Ký",
        icon: UserX,
        href: "/accountant/dashboard",
      },
    ],
  },
];

const pathTitleMap: Record<string, string> = {
  "/accountant/dashboard": "Dashboard Kế Toán",
};

export default function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isExcludedPath = EXCLUDED_PATHS.some((path) =>
    pathname?.startsWith(path),
  );

  if (isExcludedPath) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <NavigationProgress />
      <RoleSidebar
        title="Kế Toán"
        subtitle="MAY HÒA THỌ ĐIỆN BÀN"
        navGroups={navGroups}
        loginPath="/"
      />
      <SidebarInset>
        <RoleHeader
          roleLabel="Kế Toán"
          roleInitials="KT"
          dashboardPath="/accountant/dashboard"
          loginPath="/"
          pathTitleMap={pathTitleMap}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
