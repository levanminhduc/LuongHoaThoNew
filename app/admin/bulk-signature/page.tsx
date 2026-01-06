"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BulkSignatureSection } from "@/components/admin/BulkSignatureSection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            Ký Hàng Loạt Chữ Ký Nhân Viên
          </CardTitle>
          <CardDescription>
            MAY HÒA THỌ ĐIỆN BÀN - Ký hàng loạt cho nhân viên chưa ký
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkSignatureSection
            onSuccess={() => {
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
