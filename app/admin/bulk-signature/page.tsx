"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BulkSignatureSection } from "@/components/admin/BulkSignatureSection";

export default function BulkSignaturePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const userStr = localStorage.getItem("user_info");

    if (!token || !userStr) {
      router.push("/admin/login");
      return;
    }

    try {
      const userData = JSON.parse(userStr);

      if (userData.role !== "admin") {
        switch (userData.role) {
          case "truong_phong":
            router.push("/manager/dashboard");
            break;
          case "to_truong":
            router.push("/supervisor/dashboard");
            break;
          case "nhan_vien":
            router.push("/employee/dashboard");
            break;
          default:
            router.push("/admin/login");
        }
        return;
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("user_info");
      router.push("/admin/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay Lại Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ký Hàng Loạt Chữ Ký Nhân Viên
                </h1>
                <p className="text-sm text-gray-600">
                  MAY HÒA THỌ ĐIỆN BÀN - Ký hàng loạt cho nhân viên chưa ký
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BulkSignatureSection
          onSuccess={() => {
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}

