"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Settings,
  ChevronDown,
  ArrowUpDown,
  UserCheck,
  Shield,
  Cog,
} from "lucide-react"
import React from "react"

interface AdminSystemMenuProps {
  className?: string
}

export function AdminSystemMenu({ className }: AdminSystemMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const menuItems = [
    {
      id: "import-export",
      label: "Import/Export Lương",
      icon: ArrowUpDown,
      route: "/admin/payroll-import-export",
      description: "Quản lý import và export dữ liệu lương",
      colorClass: "text-blue-700 hover:text-blue-800 hover:bg-blue-50",
      iconColorClass: "text-blue-600",
    },
    {
      id: "cccd-management",
      label: "Quản Lý CCCD",
      icon: UserCheck,
      route: "/admin/dashboard/update-cccd",
      description: "Cập nhật và quản lý số CCCD nhân viên",
      colorClass: "text-green-700 hover:text-green-800 hover:bg-green-50",
      iconColorClass: "text-green-600",
    },
    {
      id: "column-mapping",
      label: "Column Mapping Config",
      icon: Cog,
      route: "/admin/column-mapping-config",
      description: "Cấu hình mapping cột dữ liệu",
      colorClass: "text-purple-700 hover:text-purple-800 hover:bg-purple-50",
      iconColorClass: "text-purple-600",
    },
    {
      id: "permission-management",
      label: "Quản Lý Phân Quyền",
      icon: Shield,
      route: "/admin/department-management",
      description: "Quản lý phân quyền và bộ phận",
      colorClass: "text-orange-700 hover:text-orange-800 hover:bg-orange-50",
      iconColorClass: "text-orange-600",
    },
  ]

  const handleMenuItemClick = (route: string) => {
    router.push(route)
    setIsOpen(false)
  }

  // Hover handlers for trigger and content
  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    // Open dropdown immediately on hover
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Set timeout to close dropdown with delay (200ms)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      hoverTimeoutRef.current = null
    }, 200)
  }

  // Keep menu open when hovering over content
  const handleContentMouseEnter = () => {
    // Clear any existing timeout to keep menu open
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`
              flex items-center gap-2 px-4 py-2 h-10
              bg-gradient-to-r from-slate-50 to-slate-100
              border-slate-200 text-slate-700
              hover:from-slate-100 hover:to-slate-200
              hover:border-slate-300 hover:text-slate-800
              focus:ring-2 focus:ring-slate-300 focus:ring-offset-1
              transition-all duration-200 ease-in-out
              shadow-sm hover:shadow-md
              ${className}
            `}
          >
            <Settings className="h-4 w-4" />
            <span className="font-medium">Quản Lý Hệ Thống</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ease-in-out ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </Button>
        </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 p-2 bg-white border border-slate-200 shadow-lg rounded-lg"
        align="end"
        sideOffset={2}
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="px-2 py-1.5 mb-1">
          <p className="text-sm font-semibold text-slate-700">Công Cụ Quản Trị</p>
          <p className="text-xs text-slate-500">Chọn chức năng cần sử dụng</p>
        </div>
        
        <DropdownMenuSeparator className="my-1" />
        
        {menuItems.map((item) => {
          const IconComponent = item.icon
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleMenuItemClick(item.route)}
              className={`
                flex items-start gap-3 p-3 rounded-md cursor-pointer
                transition-all duration-200 ease-in-out
                ${item.colorClass}
                focus:outline-none focus:ring-2 focus:ring-slate-300
                group
              `}
            >
              <div className={`
                flex-shrink-0 mt-0.5 p-1.5 rounded-md 
                bg-white border border-slate-200
                group-hover:border-current group-hover:bg-current/5
                transition-all duration-200
              `}>
                <IconComponent className={`h-4 w-4 ${item.iconColorClass} group-hover:text-current`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm leading-tight">
                  {item.label}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {item.description}
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}
        
        <DropdownMenuSeparator className="my-2" />
        
        <div className="px-2 py-1">
          <p className="text-xs text-slate-400 text-center">
            MAY HÒA THỌ ĐIỆN BÀN - Admin Tools
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
}
