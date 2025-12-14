"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },
  {
    title: "Quản Lý Nhân Viên",
    icon: Users,
    href: "/admin/employee-management",
  },
  {
    title: "Quản Lý Lương",
    icon: FileSpreadsheet,
    href: "/admin/payroll-management",
  },
];

const dataManagementItems: NavItem[] = [
  {
    title: "Import/Export Lương",
    icon: ArrowUpDown,
    href: "/admin/payroll-import-export",
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
];

const adminToolsItems: NavItem[] = [
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

interface NavMenuItemProps {
  item: NavItem;
  isActive: boolean;
  onNavigate: () => void;
}

function NavMenuItem({ item, isActive, onNavigate }: NavMenuItemProps) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href} prefetch={true} onClick={onNavigate}>
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogout = useCallback(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_info");
    router.push("/admin/login");
  }, [router]);

  const isActive = useCallback((href: string) => pathname === href, [pathname]);

  const handleNavigate = useCallback(() => {
    if (isMobile) {
      setTimeout(() => setOpenMobile(false), 100);
    }
  }, [isMobile, setOpenMobile]);

  const mainItems = useMemo(() => mainNavItems, []);
  const dataItems = useMemo(() => dataManagementItems, []);
  const toolItems = useMemo(() => adminToolsItems, []);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">MAY HÒA THỌ</span>
            <span className="text-xs text-muted-foreground">ĐIỆN BÀN</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Trang Chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <NavMenuItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  onNavigate={handleNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Quản Lý Dữ Liệu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map((item) => (
                <NavMenuItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  onNavigate={handleNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center">
                Công Cụ Admin
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {toolItems.map((item) => (
                    <NavMenuItem
                      key={item.href}
                      item={item}
                      isActive={isActive(item.href)}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              tooltip="Đăng Xuất"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng Xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
