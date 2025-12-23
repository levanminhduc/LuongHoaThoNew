"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, Building2 } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import type { LucideIcon } from "lucide-react";

export interface RoleNavItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

export interface RoleNavGroup {
  label: string;
  items: RoleNavItem[];
}

interface RoleSidebarProps {
  title: string;
  subtitle: string;
  navGroups: RoleNavGroup[];
  loginPath?: string;
}

function NavMenuItem({
  item,
  isActive,
  onNavigate,
}: {
  item: RoleNavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
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

export function RoleSidebar({
  title,
  subtitle,
  navGroups,
  loginPath = "/",
}: RoleSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore error
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_info");
    router.push(loginPath);
  }, [router, loginPath]);

  const isActive = useCallback((href: string) => pathname === href, [pathname]);

  const handleNavigate = useCallback(() => {
    if (isMobile) {
      setTimeout(() => setOpenMobile(false), 100);
    }
  }, [isMobile, setOpenMobile]);

  const groups = useMemo(() => navGroups, [navGroups]);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item, itemIndex) => (
                  <NavMenuItem
                    key={`${item.href}-${item.title}-${itemIndex}`}
                    item={item}
                    isActive={isActive(item.href)}
                    onNavigate={handleNavigate}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
