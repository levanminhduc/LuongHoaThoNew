"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { 
  Menu, 
  X, 
  Home, 
  PenTool, 
  BarChart3, 
  FileSpreadsheet,
  LogOut,
  User,
  Building2
} from "lucide-react"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  userInfo?: {
    full_name: string
    employee_id: string
    department: string
    role: string
  }
  onLogout?: () => void
  navigation?: Array<{
    label: string
    href?: string
    icon?: React.ReactNode
    active?: boolean
    onClick?: () => void
  }>
  actions?: React.ReactNode
  className?: string
}

const ROLE_LABELS = {
  admin: 'Quản Trị Viên',
  giam_doc: 'Giám Đốc',
  ke_toan: 'Kế Toán',
  nguoi_lap_bieu: 'Người Lập Biểu',
  truong_phong: 'Trưởng Phòng',
  to_truong: 'Tổ Trưởng',
  nhan_vien: 'Nhân Viên'
}

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800',
  giam_doc: 'bg-blue-100 text-blue-800',
  ke_toan: 'bg-green-100 text-green-800',
  nguoi_lap_bieu: 'bg-purple-100 text-purple-800',
  truong_phong: 'bg-yellow-100 text-yellow-800',
  to_truong: 'bg-orange-100 text-orange-800',
  nhan_vien: 'bg-gray-100 text-gray-800'
}

export default function ResponsiveLayout({
  children,
  title,
  subtitle,
  userInfo,
  onLogout,
  navigation = [],
  actions,
  className = ""
}: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const defaultNavigation = [
    {
      label: 'Dashboard',
      icon: <Home className="h-4 w-4" />,
      active: true
    },
    {
      label: 'Ký Xác Nhận',
      icon: <PenTool className="h-4 w-4" />
    },
    {
      label: 'Tiến Độ',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      label: 'Lịch Sử',
      icon: <FileSpreadsheet className="h-4 w-4" />
    }
  ]

  const navItems = navigation.length > 0 ? navigation : defaultNavigation

  const NavigationContent = () => (
    <nav className="space-y-1">
      {navItems.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick?.()
            setIsMobileMenuOpen(false)
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            item.active
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  )

  const UserInfo = () => (
    userInfo && (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userInfo.full_name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {userInfo.employee_id}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 truncate">
              {userInfo.department}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={ROLE_COLORS[userInfo.role as keyof typeof ROLE_COLORS] || 'bg-gray-100 text-gray-800'}>
              {ROLE_LABELS[userInfo.role as keyof typeof ROLE_LABELS] || userInfo.role}
            </Badge>
          </div>
        </div>
      </div>
    )
  )

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              {isMobile && (
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="md:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Menu</h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <UserInfo />
                      <NavigationContent />
                      
                      {onLogout && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            onLogout()
                            setIsMobileMenuOpen(false)
                          }}
                          className="w-full"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Đăng Xuất
                        </Button>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-gray-600 hidden sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {actions}
              
              {!isMobile && userInfo && (
                <div className="hidden md:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {userInfo.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ROLE_LABELS[userInfo.role as keyof typeof ROLE_LABELS] || userInfo.role}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              )}
              
              {!isMobile && onLogout && (
                <Button variant="outline" onClick={onLogout} size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng Xuất
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      {!isMobile && navigation.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 py-3">
              {navItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>
    </div>
  )
}
