"use client";

import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface AdminHeaderProps {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

const pathTitleMap: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/employee-management": "Quản Lý Nhân Viên",
  "/admin/payroll-management": "Quản Lý Lương",
  "/admin/payroll-import-export": "Import/Export Lương",
  "/admin/data-validation": "Kiểm Tra Dữ Liệu",
  "/admin/bulk-signature": "Ký Hàng Loạt",
  "/admin/dashboard/update-cccd": "Quản Lý CCCD",
  "/admin/column-mapping-config": "Column Mapping",
  "/admin/department-management": "Phân Quyền",
};

export function AdminHeader({ title, breadcrumbs }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const pageTitle = title || pathTitleMap[pathname] || "Admin";

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_info");
    router.push("/admin/login");
  };

  return (
    <header className="sticky top-8 sm:top-9 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs ? (
            breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={index}>
                <BreadcrumbSeparator />
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))
          ) : (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-lg font-semibold md:hidden">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Thông báo</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Tài khoản Admin</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive"
            >
              Đăng Xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
