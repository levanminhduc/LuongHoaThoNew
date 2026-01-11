"use client";

import { useRouter } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Settings,
  ArrowUpDown,
  UserCheck,
  Shield,
  Cog,
  Database,
  KeyRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSystemMenuProps {
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  href: string;
  colorClass: string;
  iconColorClass: string;
}

export function AdminSystemMenu({ className }: AdminSystemMenuProps) {
  const router = useRouter();

  const menuItems: MenuItem[] = [
    {
      id: "import-export",
      label: "Import/Export Lương",
      icon: ArrowUpDown,
      description: "Quản lý import và export dữ liệu lương",
      href: "/admin/payroll-import-export",
      colorClass: "text-blue-700 hover:text-blue-800 hover:bg-blue-50",
      iconColorClass: "text-blue-600",
    },
    {
      id: "data-validation",
      label: "Kiểm Tra Dữ Liệu",
      icon: Database,
      description: "So sánh nhân viên vs dữ liệu lương, phát hiện thiếu sót",
      href: "/admin/data-validation",
      colorClass: "text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50",
      iconColorClass: "text-cyan-600",
    },
    {
      id: "bulk-signature",
      label: "Ký Hàng Loạt",
      icon: Users,
      description: "Ký hàng loạt chữ ký cho nhân viên chưa ký",
      href: "/admin/bulk-signature",
      colorClass: "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50",
      iconColorClass: "text-indigo-600",
    },
    {
      id: "cccd-management",
      label: "Quản Lý CCCD",
      icon: UserCheck,
      description: "Cập nhật và quản lý số CCCD nhân viên",
      href: "/admin/dashboard/update-cccd",
      colorClass: "text-green-700 hover:text-green-800 hover:bg-green-50",
      iconColorClass: "text-green-600",
    },
    {
      id: "column-mapping",
      label: "Column Mapping Config",
      icon: Cog,
      description: "Cấu hình mapping cột dữ liệu",
      href: "/admin/column-mapping-config",
      colorClass: "text-purple-700 hover:text-purple-800 hover:bg-purple-50",
      iconColorClass: "text-purple-600",
    },
    {
      id: "permission-management",
      label: "Quản Lý Phân Quyền",
      icon: Shield,
      description: "Quản lý phân quyền và bộ phận",
      href: "/admin/department-management",
      colorClass: "text-orange-700 hover:text-orange-800 hover:bg-orange-50",
      iconColorClass: "text-orange-600",
    },
    {
      id: "password-reset-history",
      label: "Lịch Sử Đổi Mật Khẩu",
      icon: KeyRound,
      description: "Theo dõi hoạt động đổi mật khẩu, phát hiện IP nghi ngờ",
      href: "/admin/password-reset-history",
      colorClass: "text-red-700 hover:text-red-800 hover:bg-red-50",
      iconColorClass: "text-red-600",
    },
  ];

  return (
    <NavigationMenu className={className}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              "bg-gradient-to-r from-slate-50 to-slate-100",
              "border border-slate-200 text-slate-700",
              "hover:from-slate-100 hover:to-slate-200",
              "hover:border-slate-300 hover:text-slate-800",
              "focus:ring-2 focus:ring-slate-300 focus:ring-offset-1",
              "shadow-sm hover:shadow-md",
            )}
          >
            <Settings className="mr-2 h-4 w-4" />
            Quản Lý Hệ Thống
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-80 p-4">
              <div className="mb-3 border-b pb-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  Công Cụ Quản Trị
                </h4>
                <p className="text-xs text-gray-500">
                  Chọn chức năng cần sử dụng
                </p>
              </div>
              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => router.push(item.href)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors",
                          item.colorClass,
                        )}
                      >
                        <Icon
                          className={cn("mt-0.5 h-4 w-4", item.iconColorClass)}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {item.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.description}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 border-t pt-2 text-center text-xs text-gray-400">
                MAY HÒA THỌ ĐIỆN BÀN - Admin Tools
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
