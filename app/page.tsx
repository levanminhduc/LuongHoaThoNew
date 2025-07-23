import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Shield, FileSpreadsheet } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Tra Cứu Lương</h1>
          <p className="text-xl text-gray-600">MAY HÒA THỌ ĐIỆN BÀN</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Admin Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Quản Trị Viên</CardTitle>
              <CardDescription>Đăng nhập để quản lý dữ liệu lương và upload file Excel</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Upload file Excel</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Quản lý dữ liệu lương</span>
                  </div>
                </div>
                <Link href="/admin/login">
                  <Button className="w-full" size="lg">
                    Đăng Nhập Admin
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Employee Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Nhân Viên</CardTitle>
              <CardDescription>Tra cứu thông tin lương bằng mã nhân viên và số CCCD</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Nhập mã nhân viên và số CCCD để xem thông tin lương của bạn</p>
                </div>
                <Link href="/employee/lookup">
                  <Button
                    variant="outline"
                    className="w-full bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    size="lg"
                  >
                    Tra Cứu Lương
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center text-gray-500">
          <p className="text-sm">© 2025 Hệ Thống Tra Cứu Lương. MAY HÒA THỌ ĐIỆN BÀN</p>
        </div>
      </div>
    </div>
  )
}
