"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  RoleSidebar,
  type RoleNavGroup,
} from "@/components/shared/role-sidebar";
import { RoleHeader } from "@/components/shared/role-header";
import { NavigationProgress } from "@/components/admin/navigation-progress";
import { LayoutDashboard, PenTool, Eye, UserX } from "lucide-react";

const EXCLUDED_PATHS = ["/director/login"];

const navGroups: RoleNavGroup[] = [
  {
    label: "Tổng Quan",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/director/dashboard",
      },
    ],
  },
  {
    label: "Ký Xác Nhận",
    items: [{ title: "Ký Lương", icon: PenTool, href: "/director/dashboard" }],
  },
  {
    label: "Xem Dữ Liệu",
    items: [
      { title: "Xem Tổng Quan", icon: Eye, href: "/director/dashboard" },
      { title: "Nhân Viên Chưa Ký", icon: UserX, href: "/director/dashboard" },
    ],
  },
];

const pathTitleMap: Record<string, string> = {
  "/director/dashboard": "Dashboard Giám Đốc",
};

export default function DirectorLayout({
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
        title="Giám Đốc"
        subtitle="MAY HÒA THỌ ĐIỆN BÀN"
        navGroups={navGroups}
        loginPath="/"
      />
      <SidebarInset>
        <RoleHeader
          roleLabel="Giám Đốc"
          roleInitials="GĐ"
          dashboardPath="/director/dashboard"
          loginPath="/"
          pathTitleMap={pathTitleMap}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
