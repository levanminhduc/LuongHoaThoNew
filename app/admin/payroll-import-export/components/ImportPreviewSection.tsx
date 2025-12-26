"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { useImportPreview } from "@/lib/hooks/useImportPreview";
import type { ImportPreviewSectionProps } from "@/lib/types/payroll-preview";

export function ImportPreviewSection({
  importBatchId,
  successCount,
}: ImportPreviewSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { previewData, loading, error, loadPreview } = useImportPreview();

  const handleTogglePreview = async () => {
    if (!isExpanded && previewData.length === 0) {
      await loadPreview(importBatchId);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span>Xem Dữ Liệu Đã Import</span>
            <Badge variant="outline">{successCount} records</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePreview}
            className="flex items-center gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ẩn
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Xem Chi Tiết
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <ImportPreviewTable
            data={previewData}
            loading={loading}
            error={error}
          />
        </CardContent>
      )}
    </Card>
  );
}
