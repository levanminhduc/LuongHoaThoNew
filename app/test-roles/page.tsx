"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  Users,
  Crown,
  Calculator,
  FileText,
} from "lucide-react";

export default function TestRolesPage() {
  const testAccounts = [
    // Admin account removed for security reasons
    {
      username: "TP001",
      password: "truongphong123",
      role: "Trưởng Phòng",
      description: "Quản lý nhiều departments",
      dashboard: "/manager/dashboard",
      color: "bg-blue-500",
      icon: Building2,
      permissions: [
        "Hoàn Thành department",
        "KCS department",
        "View/Edit payroll",
        "Export data",
      ],
    },
    {
      username: "TT001",
      password: "totruong123",
      role: "Tổ Trưởng",
      description: "Quản lý 1 department",
      dashboard: "/supervisor/dashboard",
      color: "bg-green-500",
      icon: Users,
      permissions: [
        "Hoàn Thành department only",
        "View payroll",
        "Team management",
      ],
    },
    {
      username: "NV001",
      password: "nhanvien123",
      role: "Nhân Viên",
      description: "Xem dữ liệu cá nhân",
      dashboard: "/employee/dashboard",
      color: "bg-gray-500",
      icon: User,
      permissions: [
        "Own payroll data only",
        "Personal information",
        "Download payslips",
      ],
    },
    {
      username: "GD001",
      password: "giamdoc123",
      role: "Giám Đốc",
      description: "Ký xác nhận cuối cùng",
      dashboard: "/director/dashboard",
      color: "bg-red-600",
      icon: Crown,
      permissions: [
        "All employees view",
        "Final approval",
        "System overview",
        "Management signatures",
      ],
    },
    {
      username: "KT001",
      password: "ketoan123",
      role: "Kế Toán",
      description: "Xác nhận tài chính lương",
      dashboard: "/accountant/dashboard",
      color: "bg-emerald-600",
      icon: Calculator,
      permissions: [
        "All employees view",
        "Financial verification",
        "Payroll validation",
        "Accounting reports",
      ],
    },
    {
      username: "NLB001",
      password: "nguoilapbieu123",
      role: "Người Lập Biểu",
      description: "Xác nhận báo cáo thống kê",
      dashboard: "/reporter/dashboard",
      color: "bg-purple-600",
      icon: FileText,
      permissions: [
        "All employees view",
        "Report confirmation",
        "Data validation",
        "Statistical analysis",
      ],
    },
  ];

  const handleLogin = async (
    username: string,
    password: string,
    dashboard: string,
  ) => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("user_info", JSON.stringify(data.user));

        // Redirect to appropriate dashboard
        window.location.href = dashboard;
      } else {
        const error = await response.json();
        alert(`Login failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Có lỗi xảy ra khi đăng nhập");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧪 Test Hệ Thống Phân Quyền
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            MAY HÒA THỌ ĐIỆN BÀN - Role-Based Access Control
          </p>
          <p className="text-sm text-gray-500">
            {`Click vào nút "Login & Test" để trải nghiệm từng role`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testAccounts.map((account) => {
            const IconComponent = account.icon;
            return (
              <Card key={account.username} className="relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 right-0 h-2 ${account.color}`}
                ></div>

                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 ${account.color} rounded-full flex items-center justify-center mx-auto mb-4`}
                  >
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{account.role}</CardTitle>
                  <CardDescription>{account.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Thông tin đăng nhập:
                    </p>
                    <p className="text-sm">
                      <strong>Username:</strong> {account.username}
                    </p>
                    <p className="text-sm">
                      <strong>Password:</strong> {account.password}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Quyền truy cập:
                    </p>
                    <div className="space-y-1">
                      {account.permissions.map((permission, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs mr-1 mb-1"
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() =>
                      handleLogin(
                        account.username,
                        account.password,
                        account.dashboard,
                      )
                    }
                  >
                    🚀 Login & Test
                  </Button>

                  <div className="text-xs text-gray-500 text-center">
                    Dashboard:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      {account.dashboard}
                    </code>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 Hướng Dẫn Test
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                🔍 Các tính năng cần test:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  ✅ <strong>Role-based routing:</strong> Mỗi role redirect đúng
                  dashboard
                </li>
                <li>
                  ✅ <strong>Data filtering:</strong> Chỉ xem được data theo
                  quyền
                </li>
                <li>
                  ✅ <strong>UI permissions:</strong> Buttons/features theo role
                </li>
                <li>
                  ✅ <strong>API security:</strong> Không thể access API ngoài
                  quyền
                </li>
                <li>
                  ✅ <strong>Department access:</strong> Trưởng phòng xem nhiều
                  departments
                </li>
                <li>
                  ✅ <strong>Audit logging:</strong> Tất cả actions được log
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                🎯 Test scenarios:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>🔸 Login với từng role và kiểm tra dashboard</li>
                <li>🔸 Thử truy cập URL của role khác (sẽ bị redirect)</li>
                <li>🔸 Test export/import functions theo quyền</li>
                <li>🔸 Kiểm tra department filtering</li>
                <li>🔸 Test logout và login lại</li>
                <li>🔸 Kiểm tra responsive design trên mobile</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              💡 Lưu ý quan trọng:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Hệ thống sử dụng JWT tokens với role-based payload</li>
              <li>• Database có RLS policies để bảo vệ data</li>
              <li>• Tất cả API calls được audit log</li>
              <li>
                • Test accounts chỉ dùng cho demo, production sẽ dùng real data
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            🔗 <strong>Direct Links:</strong>
            <a
              href="/admin/dashboard"
              className="text-blue-600 hover:underline mx-2"
            >
              Admin
            </a>{" "}
            |
            <a
              href="/manager/dashboard"
              className="text-blue-600 hover:underline mx-2"
            >
              Manager
            </a>{" "}
            |
            <a
              href="/supervisor/dashboard"
              className="text-blue-600 hover:underline mx-2"
            >
              Supervisor
            </a>{" "}
            |
            <a
              href="/employee/dashboard"
              className="text-blue-600 hover:underline mx-2"
            >
              Employee
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            (Cần login trước khi truy cập direct links)
          </p>
        </div>
      </div>
    </div>
  );
}
