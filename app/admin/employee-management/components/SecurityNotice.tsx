"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Eye, Database } from "lucide-react";

export default function SecurityNotice() {
  return (
    <div className="space-y-4 mb-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Bảo Mật Thông Tin:</strong> Tất cả thông tin nhân viên được
          bảo vệ bởi hệ thống bảo mật nhiều lớp.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4 text-green-600" />
          <span>CCCD được mã hóa bcrypt</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4 text-orange-600" />
          <span>Chỉ admin có quyền truy cập</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="h-4 w-4 text-blue-600" />
          <span>Audit log tự động</span>
        </div>
      </div>
    </div>
  );
}
