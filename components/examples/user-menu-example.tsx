"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  User,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  CreditCard,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuExampleProps {
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

export function UserMenuExample({ className }: UserMenuExampleProps) {
  const handleLogout = () => {
    console.log("Logging out...");
  };

  const handleSettings = () => {
    console.log("Opening settings...");
  };

  const handleProfile = () => {
    console.log("Opening profile...");
  };

  const handleNotifications = () => {
    console.log("Opening notifications...");
  };

  const handleBilling = () => {
    console.log("Opening billing...");
  };

  const handleHelp = () => {
    console.log("Opening help...");
  };

  const handleSecurity = () => {
    console.log("Opening security...");
  };

  const menuSections: MenuSection[] = [
    {
      title: "Tài Khoản",
      description: "Quản lý thông tin cá nhân",
      items: [
        {
          id: "profile",
          label: "Hồ Sơ Cá Nhân",
          icon: User,
          description: "Xem và chỉnh sửa thông tin cá nhân",
          onClick: handleProfile,
        },
        {
          id: "notifications",
          label: "Thông Báo",
          icon: Bell,
          description: "Quản lý thông báo và cảnh báo",
          onClick: handleNotifications,
        },
      ],
    },
    {
      title: "Cài Đặt",
      description: "Tùy chỉnh và cấu hình",
      items: [
        {
          id: "settings",
          label: "Cài Đặt",
          icon: Settings,
          description: "Tùy chỉnh ứng dụng",
          onClick: handleSettings,
        },
        {
          id: "security",
          label: "Bảo Mật",
          icon: Shield,
          description: "Quản lý mật khẩu và bảo mật",
          onClick: handleSecurity,
        },
        {
          id: "billing",
          label: "Thanh Toán",
          icon: CreditCard,
          description: "Quản lý thanh toán và hóa đơn",
          onClick: handleBilling,
        },
      ],
    },
    {
      title: "Hỗ Trợ",
      items: [
        {
          id: "help",
          label: "Trợ Giúp",
          icon: HelpCircle,
          description: "Hướng dẫn và hỗ trợ",
          onClick: handleHelp,
        },
        {
          id: "logout",
          label: "Đăng Xuất",
          icon: LogOut,
          description: "Thoát khỏi tài khoản",
          colorClass: "text-red-700 hover:text-red-800 hover:bg-red-50",
          iconColorClass: "text-red-600",
          onClick: handleLogout,
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
              "bg-white border border-gray-200 text-gray-700",
              "hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800",
              "focus:ring-2 focus:ring-blue-300 focus:ring-offset-1",
              "shadow-sm hover:shadow-md",
            )}
          >
            <User className="mr-2 h-4 w-4" />
            Tài Khoản
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-72 p-4">
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
                © 2024 Your Company
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
