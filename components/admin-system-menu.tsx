"use client"

import { useRouter } from "next/navigation"
import { HoverDropdownMenu, type DropdownMenuItem } from "@/components/ui/hover-dropdown-menu"
import {
  Settings,
  ArrowUpDown,
  UserCheck,
  Shield,
  Cog,
  Database,
} from "lucide-react"

interface AdminSystemMenuProps {
  className?: string
}

export function AdminSystemMenu({ className }: AdminSystemMenuProps) {
  const router = useRouter()

  const menuItems: DropdownMenuItem[] = [
    {
      id: "import-export",
      label: "Import/Export Lương",
      icon: ArrowUpDown,
      description: "Quản lý import và export dữ liệu lương",
      colorClass: "text-blue-700 hover:text-blue-800 hover:bg-blue-50",
      iconColorClass: "text-blue-600",
      onClick: () => router.push("/admin/payroll-import-export"),
    },
    {
      id: "data-validation",
      label: "Kiểm Tra Dữ Liệu",
      icon: Database,
      description: "So sánh nhân viên vs dữ liệu lương, phát hiện thiếu sót",
      colorClass: "text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50",
      iconColorClass: "text-cyan-600",
      onClick: () => router.push("/admin/data-validation"),
    },
    {
      id: "cccd-management",
      label: "Quản Lý CCCD",
      icon: UserCheck,
      description: "Cập nhật và quản lý số CCCD nhân viên",
      colorClass: "text-green-700 hover:text-green-800 hover:bg-green-50",
      iconColorClass: "text-green-600",
      onClick: () => router.push("/admin/dashboard/update-cccd"),
    },
    {
      id: "column-mapping",
      label: "Column Mapping Config",
      icon: Cog,
      description: "Cấu hình mapping cột dữ liệu",
      colorClass: "text-purple-700 hover:text-purple-800 hover:bg-purple-50",
      iconColorClass: "text-purple-600",
      onClick: () => router.push("/admin/column-mapping-config"),
    },
    {
      id: "permission-management",
      label: "Quản Lý Phân Quyền",
      icon: Shield,
      description: "Quản lý phân quyền và bộ phận",
      colorClass: "text-orange-700 hover:text-orange-800 hover:bg-orange-50",
      iconColorClass: "text-orange-600",
      onClick: () => router.push("/admin/department-management"),
    },
  ]

  return (
    <HoverDropdownMenu
      triggerLabel="Quản Lý Hệ Thống"
      triggerIcon={Settings}
      triggerClassName={`
        bg-gradient-to-r from-slate-50 to-slate-100
        border-slate-200 text-slate-700
        hover:from-slate-100 hover:to-slate-200
        hover:border-slate-300 hover:text-slate-800
        focus:ring-2 focus:ring-slate-300 focus:ring-offset-1
        shadow-sm hover:shadow-md
        ${className}
      `}
      menuSections={[
        {
          title: "Công Cụ Quản Trị",
          description: "Chọn chức năng cần sử dụng",
          items: menuItems
        }
      ]}
      menuWidth="w-80"
      menuAlign="end"
      sideOffset={2}
      hoverDelay={200}
      footerText="MAY HÒA THỌ ĐIỆN BÀN - Admin Tools"
      variant="outline"
    />
  )
}
