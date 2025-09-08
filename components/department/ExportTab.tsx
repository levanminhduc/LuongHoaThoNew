"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileCheck, DollarSign, Users } from "lucide-react"

interface DepartmentStats {
  totalEmployees: number
  payrollCount: number
  signedCount: number
  signedPercentage: string
  totalSalary: number
  averageSalary: number
}

interface ExportTabProps {
  departmentName: string
  month: string
  stats: DepartmentStats
  onExport: (exportType?: 'full' | 'summary' | 'employees') => void
  onQuickAction: (action: 'unsigned' | 'salary-desc' | 'signed') => void
  onClose: () => void
  exporting: boolean
}

export default function ExportTab({
  departmentName,
  month,
  stats,
  onExport,
  onQuickAction,
  onClose,
  exporting
}: ExportTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            Xuất Dữ Liệu Bộ Phận
          </CardTitle>
          <CardDescription className="text-sm">
            Xuất dữ liệu chi tiết của bộ phận {departmentName} tháng {month}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm sm:text-base">Thông Tin Xuất</h4>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
              <li>• Danh sách nhân viên ({stats.totalEmployees})</li>
              <li>• Dữ liệu lương chi tiết ({stats.payrollCount})</li>
              <li>• Trạng thái ký lương</li>
              <li>• Thống kê tổng hợp</li>
              <li>• Phân tích xu hướng</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm sm:text-base">Định Dạng File</h4>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
              <li>• Excel (.xlsx)</li>
              <li>• Multiple sheets cho từng loại dữ liệu</li>
              <li>• Định dạng chuẩn Việt Nam</li>
              <li>• Tương thích Excel, LibreOffice</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => onExport('full')}
              disabled={exporting}
              className="flex items-center gap-2 w-full h-10 sm:h-9 touch-manipulation"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{exporting ? "Đang xuất..." : "Xuất Excel Đầy Đủ"}</span>
              <span className="sm:hidden">{exporting ? "Xuất..." : "Xuất Đầy Đủ"}</span>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => onExport('summary')}
                disabled={exporting}
                className="flex items-center gap-2 h-9 sm:h-8 touch-manipulation"
                size="sm"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Tóm Tắt</span>
                <span className="sm:hidden">TT</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => onExport('employees')}
                disabled={exporting}
                className="flex items-center gap-2 h-9 sm:h-8 touch-manipulation"
                size="sm"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Nhân Viên</span>
                <span className="sm:hidden">NV</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          <CardDescription className="text-sm">
            Các thao tác nhanh cho bộ phận này
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              className="justify-start h-10 sm:h-9 touch-manipulation"
              onClick={() => onQuickAction('unsigned')}
            >
              <FileCheck className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Xem nhân viên chưa ký ({stats.payrollCount - stats.signedCount})</span>
                <span className="sm:hidden">Chưa ký ({stats.payrollCount - stats.signedCount})</span>
              </span>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-10 sm:h-9 touch-manipulation"
              onClick={() => onQuickAction('salary-desc')}
            >
              <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Sắp xếp theo lương cao nhất</span>
                <span className="sm:hidden">Lương cao nhất</span>
              </span>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-10 sm:h-9 touch-manipulation"
              onClick={() => onQuickAction('signed')}
            >
              <Users className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Xem nhân viên đã ký ({stats.signedCount})</span>
                <span className="sm:hidden">Đã ký ({stats.signedCount})</span>
              </span>
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-10 sm:h-9 touch-manipulation"
            >
              <span className="hidden sm:inline">Đóng Modal</span>
              <span className="sm:hidden">Đóng</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
