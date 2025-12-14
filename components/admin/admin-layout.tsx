"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { NavigationProgress } from "./navigation-progress";
import { AdminPrefetch } from "./admin-prefetch";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AdminLayout({
  children,
  title,
  breadcrumbs,
}: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <NavigationProgress />
      <AdminPrefetch />
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader title={title} breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
