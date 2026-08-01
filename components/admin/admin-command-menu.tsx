"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getSessionUser } from "@/lib/auth/secure-session";
import { useLogout } from "@/lib/hooks/use-logout";
import {
  adminToolsItems,
  dataManagementItems,
  filterNavItemsByRole,
  mainNavItems,
  type NavItem,
} from "@/components/admin/admin-nav-items";
import { LogOut } from "lucide-react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function AdminCommandMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState("admin");
  const isAdminShell =
    pathname?.startsWith("/admin") && !pathname.startsWith("/admin/login");

  useEffect(() => {
    void getSessionUser<{ role?: string }>().then((user) =>
      setCurrentRole(user?.role || "admin"),
    );
  }, []);

  useEffect(() => {
    if (!isAdminShell) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey) return;
      if (event.key !== "k" && event.key !== "K") return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      setOpen((previous) => !previous);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdminShell]);

  const groups = useMemo(
    () =>
      [
        { heading: "Điều Hướng", items: mainNavItems },
        { heading: "Dữ Liệu", items: dataManagementItems },
        { heading: "Công Cụ Quản Trị", items: adminToolsItems },
      ]
        .map((group) => ({
          heading: group.heading,
          items: filterNavItemsByRole(group.items, currentRole),
        }))
        .filter((group) => group.items.length > 0),
    [currentRole],
  );

  const handleNavigate = useCallback(
    (item: NavItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Tìm trang hoặc chức năng..." />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.href}`}
                  onSelect={() => handleNavigate(item)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Tài Khoản">
          <CommandItem
            value="Đăng xuất logout"
            onSelect={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng Xuất</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
