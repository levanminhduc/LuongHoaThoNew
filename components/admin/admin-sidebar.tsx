"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronDown, Building2 } from "lucide-react";
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
import { useLogout } from "@/lib/hooks/use-logout";
import { useAdminSession } from "@/components/admin/admin-session-provider";
import { useNavigationPending } from "@/components/admin/navigation-pending-context";
import {
  adminToolsItems,
  dataManagementItems,
  filterNavItemsByRole,
  mainNavItems,
  type NavItem,
} from "@/components/admin/admin-nav-items";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
  truong_phong: "Trưởng Phòng",
  to_truong: "Tổ Trưởng",
  van_phong: "Văn Phòng",
};

interface NavMenuItemProps {
  item: NavItem;
  isActive: boolean;
  isPending: boolean;
  onNavigate: (href: string) => void;
  onHover: (href: string) => void;
}

function NavMenuItem({
  item,
  isActive,
  isPending,
  onNavigate,
  onHover,
}: NavMenuItemProps) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
      >
        <Link
          href={item.href}
          prefetch={false}
          onClick={() => onNavigate(item.href)}
          onMouseEnter={() => onHover(item.href)}
        >
          <Icon
            className={cn(
              "h-4 w-4 transition-opacity",
              isPending && "animate-pulse opacity-70",
            )}
          />
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
  const logout = useLogout();
  const { role: currentRole } = useAdminSession();
  const { pendingHref, startPending } = useNavigationPending();

  const isActive = useCallback(
    (href: string) => {
      if (pendingHref) return pendingHref === href;
      return pathname === href;
    },
    [pathname, pendingHref],
  );

  const handleNavigate = useCallback(
    (href: string) => {
      if (href !== pathname) startPending(href);
      if (isMobile) {
        setTimeout(() => setOpenMobile(false), 100);
      }
    },
    [isMobile, setOpenMobile, startPending, pathname],
  );

  const handleHoverPrefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  const filterByRole = useCallback(
    (items: NavItem[]) => filterNavItemsByRole(items, currentRole),
    [currentRole],
  );

  const mainItems = useMemo(() => filterByRole(mainNavItems), [filterByRole]);
  const dataItems = useMemo(
    () => filterByRole(dataManagementItems),
    [filterByRole],
  );
  const toolItems = useMemo(
    () => filterByRole(adminToolsItems),
    [filterByRole],
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">
                MAY HÒA THỌ
              </span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                {ROLE_LABEL[currentRole] ?? currentRole}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">ĐIỆN BÀN</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider">
            Trang Chính
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <NavMenuItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  isPending={pendingHref === item.href}
                  onNavigate={handleNavigate}
                  onHover={handleHoverPrefetch}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider">
            Quản Lý Dữ Liệu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map((item) => (
                <NavMenuItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  isPending={pendingHref === item.href}
                  onNavigate={handleNavigate}
                  onHover={handleHoverPrefetch}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel
              asChild
              className="text-[11px] font-semibold uppercase tracking-wider"
            >
              <CollapsibleTrigger className="flex w-full items-center hover:text-foreground">
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
                      isPending={pendingHref === item.href}
                      onNavigate={handleNavigate}
                      onHover={handleHoverPrefetch}
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
              onClick={logout}
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
