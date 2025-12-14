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
  Users,
  FileSpreadsheet,
  Building2,
} from "lucide-react";

const EXCLUDED_PATHS = ["/manager/login"];

const navGroups: RoleNavGroup[] = [
  {
    label: "Tổng Quan",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/manager/dashboard" },
    ],
  },
  {
    label: "Quản Lý",
    items: [
      { title: "Nhân Viên", icon: Users, href: "/manager/dashboard" },
      {
        title: "Bảng Lương",
        icon: FileSpreadsheet,
        href: "/manager/dashboard",
      },
      { title: "Phòng Ban", icon: Building2, href: "/manager/dashboard" },
    ],
  },
];

const pathTitleMap: Record<string, string> = {
  "/manager/dashboard": "Dashboard Trưởng Phòng",
};

export default function ManagerLayout({
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
        title="Trưởng Phòng"
        subtitle="MAY HÒA THỌ ĐIỆN BÀN"
        navGroups={navGroups}
        loginPath="/"
      />
      <SidebarInset>
        <RoleHeader
          roleLabel="Trưởng Phòng"
          roleInitials="TP"
          dashboardPath="/manager/dashboard"
          loginPath="/"
          pathTitleMap={pathTitleMap}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
