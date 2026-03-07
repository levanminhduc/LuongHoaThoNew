import { EmployeeLookup } from "./employee-lookup";

export default function EmployeeLookupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full">
        <div className="text-center mb-6 sm:mb-8 px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tra Cứu Lương & Ký Xác Nhận Lương
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-blue-900 mt-2">
            CÔNG TY MAY HÒA THỌ ĐIỆN BÀN
          </h2>
        </div>
        <EmployeeLookup />
      </div>
    </div>
  );
}
