import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedGradientButton } from "@/components/ui/animated-gradient-button";
import { Users, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center p-3 sm:p-4 pt-8 sm:pt-12 md:pt-16 antialiased">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-3 sm:mb-4 px-2">
            Tra Cứu Lương và Ký Xác Nhận
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium tracking-wide px-2">
            MAY HÒA THỌ ĐIỆN BÀN
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl tracking-tight">
                Quản Lý Các Bộ Phận
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Đăng nhập để quản lý dữ liệu lương
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-3">
                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Quản lý dữ liệu lương</span>
                  </div>
                </div>
                <Link href="/admin/login">
                  <AnimatedGradientButton variant="blue" className="w-full">
                    Đăng Nhập
                  </AnimatedGradientButton>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl tracking-tight">
                Nhân Viên
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Tra cứu thông tin lương cá nhân
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-3">
                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <p>Nhập mã nhân viên và số CCCD để xem thông tin lương</p>
                </div>
                <Link href="/employee/lookup">
                  <AnimatedGradientButton variant="green" className="w-full">
                    Tra Cứu Lương
                  </AnimatedGradientButton>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 sm:mt-8 md:mt-10 text-center text-gray-500">
          <p className="text-xs sm:text-sm leading-relaxed">
            Copyright © 2025 Hệ thống tra cứu lương{" "}
            <strong>Công Ty May Hòa Thọ Điện Bàn</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
