import { EmployeeLookup } from "./employee-lookup";

export default function EmployeeLookupPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full">
        <div className="text-center mb-6 sm:mb-8 px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Tra Cứu & Ký Xác Nhận Lương
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-muted-foreground mt-2">
            CÔNG TY MAY HÒA THỌ ĐIỆN BÀN
          </h2>
        </div>
        <EmployeeLookup />
      </div>
    </div>
  );
}
