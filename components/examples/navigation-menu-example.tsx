"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Menu,
  Home,
  FileText,
  Users,
  BarChart3,
  Settings,
  Database,
  Calendar,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationMenuExampleProps {
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  colorClass?: string;
  iconColorClass?: string;
  onClick: () => void;
}

interface MenuSection {
  title: string;
  description?: string;
  items: MenuItem[];
}

export function NavigationMenuExample({
  className,
}: NavigationMenuExampleProps) {
  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
  };

  const menuSections: MenuSection[] = [
    {
      title: "Chức Năng Chính",
      description: "Các tính năng cốt lõi của hệ thống",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: Home,
          description: "Trang chủ và tổng quan",
          colorClass: "text-blue-700 hover:text-blue-800 hover:bg-blue-50",
          iconColorClass: "text-blue-600",
          onClick: () => handleNavigation("/dashboard"),
        },
        {
          id: "reports",
          label: "Báo Cáo",
          icon: BarChart3,
          description: "Xem báo cáo và thống kê",
          colorClass: "text-green-700 hover:text-green-800 hover:bg-green-50",
          iconColorClass: "text-green-600",
          onClick: () => handleNavigation("/reports"),
        },
        {
          id: "users",
          label: "Người Dùng",
          icon: Users,
          description: "Quản lý người dùng",
          colorClass:
            "text-purple-700 hover:text-purple-800 hover:bg-purple-50",
          iconColorClass: "text-purple-600",
          onClick: () => handleNavigation("/users"),
        },
      ],
    },
    {
      title: "Công Cụ",
      description: "Các công cụ hỗ trợ",
      items: [
        {
          id: "documents",
          label: "Tài Liệu",
          icon: FileText,
          description: "Quản lý tài liệu và file",
          onClick: () => handleNavigation("/documents"),
        },
        {
          id: "calendar",
          label: "Lịch",
          icon: Calendar,
          description: "Xem lịch và sự kiện",
          onClick: () => handleNavigation("/calendar"),
        },
        {
          id: "messages",
          label: "Tin Nhắn",
          icon: Mail,
          description: "Hộp thư và tin nhắn",
          onClick: () => handleNavigation("/messages"),
        },
        {
          id: "database",
          label: "Cơ Sở Dữ Liệu",
          icon: Database,
          description: "Quản lý dữ liệu",
          onClick: () => handleNavigation("/database"),
        },
      ],
    },
    {
      title: "Hệ Thống",
      items: [
        {
          id: "settings",
          label: "Cài Đặt Hệ Thống",
          icon: Settings,
          description: "Cấu hình hệ thống",
          colorClass: "text-gray-700 hover:text-gray-800 hover:bg-gray-50",
          iconColorClass: "text-gray-600",
          onClick: () => handleNavigation("/system/settings"),
        },
      ],
    },
  ];

  return (
    <NavigationMenu className={className}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              "bg-indigo-600 border-indigo-600 text-white",
              "hover:bg-indigo-700 hover:border-indigo-700",
              "focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1",
              "shadow-md hover:shadow-lg",
            )}
          >
            <Menu className="mr-2 h-4 w-4" />
            Menu
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-80 p-4">
              {menuSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {sectionIndex > 0 && <div className="my-2 border-t" />}
                  <div className="mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {section.title}
                    </h4>
                    {section.description && (
                      <p className="text-xs text-gray-500">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={item.onClick}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors",
                              item.colorClass ||
                                "text-gray-700 hover:bg-gray-50",
                            )}
                          >
                            <Icon
                              className={cn(
                                "mt-0.5 h-4 w-4",
                                item.iconColorClass || "text-gray-500",
                              )}
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
                </div>
              ))}
              <div className="mt-3 border-t pt-2 text-center text-xs text-gray-400">
                Navigation Menu v1.0
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
