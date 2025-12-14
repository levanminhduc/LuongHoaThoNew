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
  FileText,
  BarChart3,
  Eye,
  Users,
  UserX,
} from "lucide-react";

const EXCLUDED_PATHS = ["/reporter/login"];

const navGroups: RoleNavGroup[] = [
  {
    label: "Tổng Quan",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/reporter/dashboard",
      },
    ],
  },
  {
    label: "Báo Cáo",
    items: [
      {
        title: "Xác Nhận Báo Cáo",
        icon: FileText,
        href: "/reporter/dashboard",
      },
      {
        title: "Thống Kê Dữ Liệu",
        icon: BarChart3,
        href: "/reporter/dashboard",
      },
    ],
  },
  {
    label: "Quản Lý",
    items: [
      { title: "Xem Tổng Quan", icon: Eye, href: "/reporter/dashboard" },
      { title: "Quản Lý Nhân Viên", icon: Users, href: "/reporter/dashboard" },
      { title: "Nhân Viên Chưa Ký", icon: UserX, href: "/reporter/dashboard" },
    ],
  },
];

const pathTitleMap: Record<string, string> = {
  "/reporter/dashboard": "Dashboard Người Lập Biểu",
};

export default function ReporterLayout({
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
        title="Người Lập Biểu"
        subtitle="MAY HÒA THỌ ĐIỆN BÀN"
        navGroups={navGroups}
        loginPath="/"
      />
      <SidebarInset>
        <RoleHeader
          roleLabel="Người Lập Biểu"
          roleInitials="NLB"
          dashboardPath="/reporter/dashboard"
          loginPath="/"
          pathTitleMap={pathTitleMap}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
