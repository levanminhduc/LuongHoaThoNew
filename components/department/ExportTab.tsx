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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Xuất Dữ Liệu Department
          </CardTitle>
          <CardDescription>
            Xuất dữ liệu chi tiết của department {departmentName} tháng {month}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Thông Tin Xuất</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Danh sách nhân viên ({stats.totalEmployees})</li>
              <li>• Dữ liệu lương chi tiết ({stats.payrollCount})</li>
              <li>• Trạng thái ký lương</li>
              <li>• Thống kê tổng hợp</li>
              <li>• Phân tích xu hướng</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Định Dạng File</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Excel (.xlsx)</li>
              <li>• Multiple sheets cho từng loại dữ liệu</li>
              <li>• Định dạng chuẩn Việt Nam</li>
              <li>• Tương thích Excel, LibreOffice</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => onExport('full')}
              disabled={exporting}
              className="flex items-center gap-2 w-full"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Đang xuất..." : "Xuất Excel Đầy Đủ"}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => onExport('summary')}
                disabled={exporting}
                className="flex items-center gap-2"
                size="sm"
              >
                <Download className="w-3 h-3" />
                Tóm Tắt
              </Button>
              <Button
                variant="outline"
                onClick={() => onExport('employees')}
                disabled={exporting}
                className="flex items-center gap-2"
                size="sm"
              >
                <Download className="w-3 h-3" />
                Nhân Viên
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Các thao tác nhanh cho department này
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => onQuickAction('unsigned')}
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Xem nhân viên chưa ký ({stats.payrollCount - stats.signedCount})
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => onQuickAction('salary-desc')}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Sắp xếp theo lương cao nhất
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => onQuickAction('signed')}
            >
              <Users className="w-4 h-4 mr-2" />
              Xem nhân viên đã ký ({stats.signedCount})
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Đóng Modal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
