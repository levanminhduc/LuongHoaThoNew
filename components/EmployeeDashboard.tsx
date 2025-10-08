"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  FileCheck,
  LogOut,
  Download,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface User {
  employee_id: string;
  username: string;
  role: string;
  department: string;
  permissions: string[];
}

interface PayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;
  tien_luong_thuc_nhan_cuoi_ky: number;
  tong_cong_tien_luong: number;
  thue_tncn: number;
  bhxh_bhtn_bhyt_total: number;
  is_signed: boolean;
  signed_at: string | null;
  employees: {
    full_name: string;
    department: string;
  };
}

interface YearlySummary {
  year: number;
  employee_id: string;
  totalMonths: number;
  signedMonths: number;
  signedPercentage: string;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalTax: number;
  totalInsurance: number;
  averageNetSalary: number;
}

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function EmployeeDashboard({
  user,
  onLogout,
}: EmployeeDashboardProps) {
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [yearlySummary, setYearlySummary] = useState<YearlySummary | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [loading, setLoading] = useState(true);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<
    Array<Record<string, unknown>>
  >([]);

  useEffect(() => {
    loadPersonalData();
    loadYearlySummary();
  }, [selectedYear]);

  const loadPersonalData = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      // Load personal payroll data
      const response = await fetch(`/api/payroll/my-data?limit=12`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayrollData(data.data || []);
      }
    } catch (error) {
      console.error("Error loading personal data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadYearlySummary = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      const response = await fetch(`/api/payroll/my-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ year: selectedYear }),
      });

      if (response.ok) {
        const data = await response.json();
        setYearlySummary(data.summary);
        setMonthlyBreakdown(data.monthlyBreakdown || []);
      }
    } catch (error) {
      console.error("Error loading yearly summary:", error);
    }
  };

  const handleDownloadPayslip = async (payrollId: number, month: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`/api/payroll/payslip/${payrollId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payslip-${user.employee_id}-${month}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading payslip:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " VND";
  };

  const getStatusColor = (isSigned: boolean) => {
    return isSigned ? "default" : "secondary";
  };

  // Prepare chart data
  const chartData = monthlyBreakdown.map((item) => ({
    month: item.month.slice(-2), // Get MM from YYYY-MM
    grossSalary: item.grossSalary / 1000000, // Convert to millions
    netSalary: item.netSalary / 1000000,
    tax: item.tax / 1000000,
    insurance: item.insurance / 1000000,
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Nhân Viên
              </h1>
              <p className="text-sm text-gray-600">
                Xin chào, {user.username} | Mã NV: {user.employee_id} |
                Department: {user.department}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem
                        key={`employee-year-${i}-${year}`}
                        value={year.toString()}
                      >
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        {yearlySummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tổng Lương Năm
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(yearlySummary.totalNetSalary / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-muted-foreground">
                  VND năm {selectedYear}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lương TB/Tháng
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(yearlySummary.averageNetSalary / 1000).toFixed(0)}K
                </div>
                <p className="text-xs text-muted-foreground">VND/tháng</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đã Ký</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {yearlySummary.signedPercentage}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {yearlySummary.signedMonths}/{yearlySummary.totalMonths} tháng
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Thuế</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(yearlySummary.totalTax / 1000).toFixed(0)}K
                </div>
                <p className="text-xs text-muted-foreground">
                  VND năm {selectedYear}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
            <TabsTrigger value="payroll">Lịch Sử Lương</TabsTrigger>
            <TabsTrigger value="trends">Biểu Đồ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thông Tin Cá Nhân</CardTitle>
                  <CardDescription>Chi tiết nhân viên</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Mã nhân viên
                      </p>
                      <p className="font-semibold">{user.employee_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Họ tên</p>
                      <p className="font-semibold">{user.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Department
                      </p>
                      <p className="font-semibold">{user.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Chức vụ</p>
                      <Badge variant="secondary">Nhân viên</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {yearlySummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tổng Kết Năm {selectedYear}</CardTitle>
                    <CardDescription>Thống kê lương và thuế</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tổng lương gốc</p>
                        <p className="font-semibold">
                          {formatCurrency(yearlySummary.totalGrossSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Tổng lương thực nhận
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(yearlySummary.totalNetSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tổng thuế TNCN</p>
                        <p className="font-semibold">
                          {formatCurrency(yearlySummary.totalTax)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tổng BHXH/BHYT</p>
                        <p className="font-semibold">
                          {formatCurrency(yearlySummary.totalInsurance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lịch Sử Lương</CardTitle>
                <CardDescription>12 tháng gần nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Tháng</th>
                        <th className="text-right p-3">Lương Gốc</th>
                        <th className="text-right p-3">Thuế TNCN</th>
                        <th className="text-right p-3">BHXH/BHYT</th>
                        <th className="text-right p-3">Thực Nhận</th>
                        <th className="text-center p-3">Trạng Thái</th>
                        <th className="text-center p-3">Ngày Ký</th>
                        <th className="text-center p-3">Tải Phiếu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollData.map((payroll) => (
                        <tr
                          key={payroll.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3 font-medium">
                            {payroll.salary_month}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(payroll.tong_cong_tien_luong || 0)}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(payroll.thue_tncn || 0)}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(payroll.bhxh_bhtn_bhyt_total || 0)}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency(
                              payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={getStatusColor(payroll.is_signed)}>
                              {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-xs text-muted-foreground">
                            {payroll.signed_at
                              ? new Date(payroll.signed_at).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "-"}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDownloadPayslip(
                                  payroll.id,
                                  payroll.salary_month,
                                )
                              }
                              disabled={!payroll.is_signed}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Biểu Đồ Lương Năm {selectedYear}</CardTitle>
                <CardDescription>
                  Xu hướng lương theo tháng (triệu VND)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [
                        `${value.toFixed(1)}M VND`,
                        "",
                      ]}
                      labelFormatter={(label) => `Tháng ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossSalary"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Lương gốc"
                    />
                    <Line
                      type="monotone"
                      dataKey="netSalary"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Lương thực nhận"
                    />
                    <Line
                      type="monotone"
                      dataKey="tax"
                      stroke="#ff7300"
                      strokeWidth={2}
                      name="Thuế TNCN"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
