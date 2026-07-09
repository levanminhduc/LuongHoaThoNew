"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth/secure-session";
import { BulkSignatureSection } from "@/components/admin/BulkSignatureSection";
import { UpdateSignatureDateDialog } from "@/components/admin/UpdateSignatureDateDialog";
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
    void (async () => {
      const session = await getSession<{ role?: string }>();

      if (!session?.user) {
        clearSession();
        router.push("/admin/login");
        return;
      }

      if (session.user.role !== "admin") {
        switch (session.user.role) {
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
      }
    })();
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
