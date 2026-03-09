"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertCircle } from "lucide-react";

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "error";
  timestamp?: string;
}

interface AlertsWidgetProps {
  alerts?: AlertItem[];
}

const defaultAlerts: AlertItem[] = [
  {
    id: "1",
    title: "Chưa ký 254 bản ghi",
    description: "Có 254 bản ghi chưa được ký nhận",
    severity: "warning",
    timestamp: "Tháng trước",
  },
  {
    id: "2",
    title: "Import thành công",
    description: "Batch import cuối cùng hoàn thành thành công",
    severity: "info",
    timestamp: "Hôm nay",
  },
];

const severityColorMap = {
  info: "bg-blue-50 border-blue-200",
  warning: "bg-orange-50 border-orange-200",
  error: "bg-red-50 border-red-200",
};

const severityBadgeMap = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-orange-100 text-orange-800",
  error: "bg-red-100 text-red-800",
};

export const AlertsWidget = memo(function AlertsWidget({
  alerts = defaultAlerts,
}: AlertsWidgetProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 border-orange-200 bg-orange-50/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">Thông Báo Quan Trọng</CardTitle>
        </div>
        <CardDescription>Những vấn đề cần được chú ý</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${severityColorMap[alert.severity]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{alert.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                </div>
                {alert.timestamp && (
                  <Badge variant="outline" className="text-xs">
                    {alert.timestamp}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
