"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: "import" | "signature" | "error" | "pending";
  user?: string;
}

interface RecentActivityWidgetProps {
  activities?: ActivityItem[];
}

const defaultActivities: ActivityItem[] = [
  {
    id: "1",
    action: "Import Batch #123",
    description: "Import nhân viên từ file CSV",
    timestamp: "10 phút trước",
    type: "import",
    user: "Admin User",
  },
  {
    id: "2",
    action: "Bulk Signature",
    description: "Ký 156 bản ghi lương",
    timestamp: "30 phút trước",
    type: "signature",
    user: "Admin User",
  },
  {
    id: "3",
    action: "Data Validation",
    description: "Kiểm tra dữ liệu cho tháng 12",
    timestamp: "1 giờ trước",
    type: "pending",
    user: "Admin User",
  },
  {
    id: "4",
    action: "Import Error",
    description: "Lỗi khi import batch #122",
    timestamp: "2 giờ trước",
    type: "error",
    user: "System",
  },
];

const typeIconMap = {
  import: <Upload className="h-4 w-4 text-blue-600" />,
  signature: <CheckCircle className="h-4 w-4 text-green-600" />,
  error: <AlertCircle className="h-4 w-4 text-red-600" />,
  pending: <Clock className="h-4 w-4 text-orange-600" />,
};

const typeLabelMap = {
  import: "Import",
  signature: "Ký nhận",
  error: "Lỗi",
  pending: "Chờ xử lý",
};

const typeBadgeMap = {
  import: "bg-blue-100 text-blue-800",
  signature: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  pending: "bg-orange-100 text-orange-800",
};

export const RecentActivityWidget = memo(function RecentActivityWidget({
  activities = defaultActivities,
}: RecentActivityWidgetProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Hoạt Động Gần Đây</CardTitle>
        <CardDescription>Lịch sử các thao tác quản lý gần đây</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 pb-4 border-b last:border-b-0"
            >
              <div className="mt-1">{typeIconMap[activity.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-sm">{activity.action}</h4>
                  <Badge
                    variant="outline"
                    className={`text-xs ${typeBadgeMap[activity.type]}`}
                  >
                    {typeLabelMap[activity.type]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{activity.timestamp}</span>
                  {activity.user && <span>•</span>}
                  {activity.user && <span>{activity.user}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
