import { AdminLoginForm } from "./admin-login-form"

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Đăng Nhập Admin</h1>
          <p className="text-gray-600 mt-2">Hệ thống Hòa Thọ Điện Bàn - Nhập thông tin để truy cập</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  )
}
