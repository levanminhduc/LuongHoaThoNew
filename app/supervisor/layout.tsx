"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  RoleSidebar,
  type RoleNavGroup,
} from "@/components/shared/role-sidebar";
import { RoleHeader } from "@/components/shared/role-header";
import { NavigationProgress } from "@/components/admin/navigation-progress";
import { LayoutDashboard, Users, FileSpreadsheet } from "lucide-react";

const EXCLUDED_PATHS = ["/supervisor/login"];

const navGroups: RoleNavGroup[] = [
  {
    label: "Tổng Quan",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/supervisor/dashboard",
      },
    ],
  },
  {
    label: "Quản Lý Tổ",
    items: [
      { title: "Nhân Viên Tổ", icon: Users, href: "/supervisor/dashboard" },
      {
        title: "Bảng Lương Tổ",
        icon: FileSpreadsheet,
        href: "/supervisor/dashboard",
      },
    ],
  },
];

const pathTitleMap: Record<string, string> = {
  "/supervisor/dashboard": "Dashboard Tổ Trưởng",
};

export default function SupervisorLayout({
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
        title="Tổ Trưởng"
        subtitle="MAY HÒA THỌ ĐIỆN BÀN"
        navGroups={navGroups}
        loginPath="/"
      />
      <SidebarInset>
        <RoleHeader
          roleLabel="Tổ Trưởng"
          roleInitials="TT"
          dashboardPath="/supervisor/dashboard"
          loginPath="/"
          pathTitleMap={pathTitleMap}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
