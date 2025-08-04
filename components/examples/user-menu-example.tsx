"use client"

import { HoverDropdownMenu, type DropdownMenuItem } from "@/components/ui/hover-dropdown-menu"
import {
  User,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  CreditCard,
  Shield,
} from "lucide-react"

interface UserMenuExampleProps {
  className?: string
}

export function UserMenuExample({ className }: UserMenuExampleProps) {
  const handleLogout = () => {
    console.log("Logging out...")
    // Implement logout logic
  }

  const handleSettings = () => {
    console.log("Opening settings...")
    // Navigate to settings
  }

  const handleProfile = () => {
    console.log("Opening profile...")
    // Navigate to profile
  }

  const handleNotifications = () => {
    console.log("Opening notifications...")
    // Navigate to notifications
  }

  const handleBilling = () => {
    console.log("Opening billing...")
    // Navigate to billing
  }

  const handleHelp = () => {
    console.log("Opening help...")
    // Navigate to help
  }

  const handleSecurity = () => {
    console.log("Opening security...")
    // Navigate to security
  }

  const accountItems: DropdownMenuItem[] = [
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
  ]

  const settingsItems: DropdownMenuItem[] = [
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
  ]

  const supportItems: DropdownMenuItem[] = [
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
  ]

  return (
    <HoverDropdownMenu
      triggerLabel="Tài Khoản"
      triggerIcon={User}
      triggerClassName={`
        bg-white border-gray-200 text-gray-700 
        hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800
        focus:ring-2 focus:ring-blue-300 focus:ring-offset-1
        shadow-sm hover:shadow-md
        ${className}
      `}
      menuSections={[
        {
          title: "Tài Khoản",
          description: "Quản lý thông tin cá nhân",
          items: accountItems
        },
        {
          title: "Cài Đặt",
          description: "Tùy chỉnh và cấu hình",
          items: settingsItems
        },
        {
          title: "Hỗ Trợ",
          items: supportItems
        }
      ]}
      menuWidth="w-72"
      menuAlign="end"
      sideOffset={4}
      hoverDelay={150}
      footerText="© 2024 Your Company"
      variant="outline"
    />
  )
}
