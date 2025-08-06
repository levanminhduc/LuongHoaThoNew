"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Calendar, X } from "lucide-react"

// Import refactored components
import DepartmentSummaryCards from "./DepartmentSummaryCards"
import EmployeeTable from "./EmployeeTable"
import SalaryAnalysisTab from "./SalaryAnalysisTab"
import DepartmentChartsTab from "./DepartmentChartsTab"
import ExportTab from "./ExportTab"

interface Employee {
  employee_id: string
  full_name: string
  chuc_vu: string
  department: string
  is_active: boolean
}

interface PayrollRecord {
  id: number
  employee_id: string
  salary_month: string
  tien_luong_thuc_nhan_cuoi_ky: number
  is_signed: boolean
  signed_at: string | null
  employees: {
    employee_id: string
    full_name: string
    department: string
    chuc_vu: string
  }
}

interface SalaryRange {
  range: string
  min: number
  max: number
  count: number
}

interface MonthlyTrend {
  month: string
  totalSalary: number
  employeeCount: number
  signedCount: number
  averageSalary: number
  signedPercentage: string
}

interface DepartmentStats {
  totalEmployees: number
  payrollCount: number
  signedCount: number
  signedPercentage: string
  totalSalary: number
  averageSalary: number
}

interface DepartmentDetail {
  name: string
  month: string
  stats: DepartmentStats
  employees: Employee[]
  payrolls: PayrollRecord[]
  salaryDistribution: SalaryRange[]
  monthlyTrends: MonthlyTrend[]
}

interface DepartmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  departmentName: string
  month: string
}

export default function DepartmentDetailModalRefactored({
  isOpen,
  onClose,
  departmentName,
  month
}: DepartmentDetailModalProps) {
  const [departmentData, setDepartmentData] = useState<DepartmentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState("employees")

  useEffect(() => {
    if (isOpen && departmentName) {
      loadDepartmentDetail()
    }
    // Reset states when modal opens
    if (isOpen) {
      setActiveTab("employees")
    }
  }, [isOpen, departmentName, month])

  const loadDepartmentDetail = async () => {
    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(
        `/api/admin/departments/${encodeURIComponent(departmentName)}?month=${month}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setDepartmentData(data.department)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Lỗi khi tải dữ liệu department")
      }
    } catch (error) {
      console.error("Error loading department detail:", error)
      setError("Có lỗi xảy ra khi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (exportType: 'full' | 'summary' | 'employees' = 'full') => {
    setExporting(true)
    try {
      const token = localStorage.getItem("admin_token")

      let url = `/api/admin/payroll-export?month=${month}&department=${encodeURIComponent(departmentName)}`
      let filename = `department-${departmentName}-${month}`

      if (exportType === 'summary') {
        filename += '-summary'
      } else if (exportType === 'employees') {
        filename += '-employees'
      }

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `${filename}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Lỗi khi xuất dữ liệu")
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      setError("Có lỗi xảy ra khi xuất dữ liệu")
    } finally {
      setExporting(false)
    }
  }

  const handleQuickAction = (action: 'unsigned' | 'salary-desc' | 'signed') => {
    // Switch to employees tab and trigger filter/sort
    setActiveTab("employees")
    // Note: The actual filter/sort logic will be handled by EmployeeTable component
    // through its internal state management
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <span className="truncate">Chi Tiết Department - {departmentName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Tháng: {month}
            {error && (
              <Badge variant="destructive" className="ml-2">
                Có lỗi
              </Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[75vh] pr-4">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-96" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadDepartmentDetail} className="mt-4">
                Thử Lại
              </Button>
            </div>
          ) : departmentData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <DepartmentSummaryCards 
                stats={departmentData.stats} 
                month={month} 
              />

              {/* Tabs Content */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="employees">👥 Nhân Viên</TabsTrigger>
                  <TabsTrigger value="analysis">💰 Phân Tích</TabsTrigger>
                  <TabsTrigger value="charts">📊 Biểu Đồ</TabsTrigger>
                  <TabsTrigger value="export">📋 Xuất Dữ Liệu</TabsTrigger>
                </TabsList>

                <TabsContent value="employees" className="space-y-4">
                  <EmployeeTable payrolls={departmentData.payrolls} />
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  <SalaryAnalysisTab 
                    stats={departmentData.stats}
                    salaryDistribution={departmentData.salaryDistribution}
                    monthlyTrends={departmentData.monthlyTrends}
                  />
                </TabsContent>

                <TabsContent value="charts" className="space-y-4">
                  <DepartmentChartsTab 
                    stats={departmentData.stats}
                    salaryDistribution={departmentData.salaryDistribution}
                    monthlyTrends={departmentData.monthlyTrends}
                  />
                </TabsContent>

                <TabsContent value="export" className="space-y-4">
                  <ExportTab 
                    departmentName={departmentName}
                    month={month}
                    stats={departmentData.stats}
                    onExport={handleExport}
                    onQuickAction={handleQuickAction}
                    onClose={onClose}
                    exporting={exporting}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
