"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getSessionUser } from "@/lib/auth/secure-session";
import {
  adminToolsItems,
  dataManagementItems,
  filterNavItemsByRole,
  mainNavItems,
  type NavItem,
} from "@/components/admin/admin-nav-items";

async function getCurrentRole(): Promise<string> {
  const user = await getSessionUser<{ role?: string }>();
  return user?.role || "admin";
}

interface NavMenuItemProps {
  item: NavItem;
  isActive: boolean;
  onNavigate: () => void;
  onHover: (href: string) => void;
}

function NavMenuItem({
  item,
  isActive,
  onNavigate,
  onHover,
}: NavMenuItemProps) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link
          href={item.href}
          prefetch={false}
          onClick={onNavigate}
          onMouseEnter={() => onHover(item.href)}
        >
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
  const logout = useLogout();
  const [currentRole, setCurrentRole] = useState("admin");

  useEffect(() => {
    void getCurrentRole().then(setCurrentRole);
  }, []);

  const isActive = useCallback((href: string) => pathname === href, [pathname]);

  const handleNavigate = useCallback(() => {
    if (isMobile) {
      setTimeout(() => setOpenMobile(false), 100);
    }
  }, [isMobile, setOpenMobile]);

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
    <Sidebar
      collapsible="icon"
      className="border-r !top-8 sm:!top-9 !h-[calc(100svh-2rem)] sm:!h-[calc(100svh-2.25rem)]"
    >
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
                  onHover={handleHoverPrefetch}
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
                  onHover={handleHoverPrefetch}
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
