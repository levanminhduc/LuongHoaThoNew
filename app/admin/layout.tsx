"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { NavigationProgress } from "@/components/admin/navigation-progress";
import { AdminPrefetch } from "@/components/admin/admin-prefetch";

const EXCLUDED_PATHS = ["/admin/login"];

export default function AdminLayout({
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
      <AdminPrefetch />
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
