import { EmployeeLookup } from "./employee-lookup"

export default function EmployeeLookupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tra Cứu Lương & Ký Xác Nhận Lương</h1>
          <h2 className="text-xl font-bold text-blue-900">CÔNG TY MAY HÒA THỌ ĐIỆN BÀN</h2>
          <p className="text-gray-600 mt-2">
            Nhập " Mã số nhân viên "  và " Số CCCD " để xem thông tin lương
          </p>
        </div>
        <EmployeeLookup />
      </div>
    </div>
  )
}
