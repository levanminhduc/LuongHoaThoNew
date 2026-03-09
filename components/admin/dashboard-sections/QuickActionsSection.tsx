"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileSpreadsheet,
  Users,
  Upload,
  CheckSquare,
  Settings,
  Download,
} from "lucide-react";

interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  variant?: "default" | "outline" | "secondary";
}

interface QuickActionsSectionProps {
  actions?: QuickActionItem[];
}

const defaultActions: QuickActionItem[] = [
  {
    id: "import-employees",
    label: "Import Nhân Viên",
    description: "Import dữ liệu nhân viên",
    icon: <Upload className="h-5 w-5" />,
    href: "/admin/dashboard?tab=employees",
  },
  {
    id: "payroll-management",
    label: "Quản Lý Lương",
    description: "Quản lý bảng lương chi tiết",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    href: "/admin/payroll-management",
  },
  {
    id: "bulk-signature",
    label: "Ký Hàng Loạt",
    description: "Ký nhận lương hàng loạt",
    icon: <CheckSquare className="h-5 w-5" />,
    href: "/admin/bulk-signature",
  },
  {
    id: "column-mapping",
    label: "Column Mapping",
    description: "Cấu hình mapping cột",
    icon: <Settings className="h-5 w-5" />,
    href: "/admin/column-mapping-config",
  },
];

export const QuickActionsSection = memo(function QuickActionsSection({
  actions = defaultActions,
}: QuickActionsSectionProps) {
  const router = useRouter();

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Thao Tác Nhanh</CardTitle>
        <CardDescription>Các chức năng thường dùng nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(action.href)}
              className="flex flex-col items-start gap-3 p-4 rounded-lg border border-border hover:bg-accent hover:border-accent transition-colors text-left group"
            >
              <div className="text-muted-foreground group-hover:text-accent-foreground transition-colors">
                {action.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm leading-tight">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
