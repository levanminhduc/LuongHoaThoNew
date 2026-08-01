"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/components/admin/admin-session-provider";
import { BulkSignatureSection } from "@/components/admin/BulkSignatureSection";
import { UpdateSignatureDateDialog } from "@/components/admin/UpdateSignatureDateDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const NON_ADMIN_ROLE_ROUTES: Record<string, string> = {
  truong_phong: "/manager/dashboard",
  to_truong: "/supervisor/dashboard",
  nhan_vien: "/employee/dashboard",
};

export default function BulkSignaturePage() {
  const router = useRouter();
  const { role } = useAdminSession();

  useEffect(() => {
    if (role === "admin") return;
    router.replace(NON_ADMIN_ROLE_ROUTES[role] ?? "/admin/login");
  }, [role, router]);

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
          <div className="flex items-end gap-4 flex-wrap">
            <BulkSignatureSection
              onSuccess={() => {
                router.refresh();
              }}
            />
            <UpdateSignatureDateDialog
              onSuccess={() => {
                router.refresh();
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
