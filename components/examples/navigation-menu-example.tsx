"use client";

import {
  HoverDropdownMenu,
  type DropdownMenuItem,
} from "@/components/ui/hover-dropdown-menu";
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

interface NavigationMenuExampleProps {
  className?: string;
}

export function NavigationMenuExample({
  className,
}: NavigationMenuExampleProps) {
  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    // Implement navigation logic
  };

  const mainItems: DropdownMenuItem[] = [
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
      colorClass: "text-purple-700 hover:text-purple-800 hover:bg-purple-50",
      iconColorClass: "text-purple-600",
      onClick: () => handleNavigation("/users"),
    },
  ];

  const toolsItems: DropdownMenuItem[] = [
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
  ];

  const systemItems: DropdownMenuItem[] = [
    {
      id: "settings",
      label: "Cài Đặt Hệ Thống",
      icon: Settings,
      description: "Cấu hình hệ thống",
      colorClass: "text-gray-700 hover:text-gray-800 hover:bg-gray-50",
      iconColorClass: "text-gray-600",
      onClick: () => handleNavigation("/system/settings"),
    },
  ];

  return (
    <HoverDropdownMenu
      triggerLabel="Menu"
      triggerIcon={Menu}
      triggerClassName={`
        bg-indigo-600 border-indigo-600 text-white 
        hover:bg-indigo-700 hover:border-indigo-700
        focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1
        shadow-md hover:shadow-lg
        ${className}
      `}
      menuSections={[
        {
          title: "Chức Năng Chính",
          description: "Các tính năng cốt lõi của hệ thống",
          items: mainItems,
        },
        {
          title: "Công Cụ",
          description: "Các công cụ hỗ trợ",
          items: toolsItems,
        },
        {
          title: "Hệ Thống",
          items: systemItems,
        },
      ]}
      menuWidth="w-80"
      menuAlign="start"
      sideOffset={4}
      hoverDelay={200}
      footerText="Navigation Menu v1.0"
      variant="default"
    />
  );
}
