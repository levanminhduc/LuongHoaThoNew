"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Ký Hàng Loạt Chữ Ký Nhân Viên
        </h1>
        <p className="text-sm text-gray-600">
          MAY HÒA THỌ ĐIỆN BÀN - Ký hàng loạt cho nhân viên chưa ký
        </p>
      </div>

      <BulkSignatureSection
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
