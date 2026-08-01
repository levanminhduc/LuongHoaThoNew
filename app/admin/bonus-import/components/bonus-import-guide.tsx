"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Download, Loader2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IMPORT_STEPS = [
  "Tải file mẫu, điền mỗi nhân viên một dòng, giữ nguyên tên cột.",
  'Các cột "Tháng 1..6" chỉ để đối chiếu, có thể thêm/bớt tùy đợt.',
  '"Tổng Thưởng" phải là số — đây là số tiền nhân viên ký nhận.',
  "Chọn Loại Thưởng, Kỳ Thưởng (vd 2026-Q2), Tiêu Đề rồi chọn file, kiểm tra bảng xem trước.",
  "Import lại cùng Loại + Kỳ sẽ ghi đè dữ liệu cũ, không tạo bản trùng.",
];

interface BonusImportGuideProps {
  onDownloadTemplate: () => void;
  downloadingTemplate: boolean;
  disabled: boolean;
}

export function BonusImportGuide({
  onDownloadTemplate,
  downloadingTemplate,
  disabled,
}: BonusImportGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-blue-200 bg-blue-50/60">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-600" />
                Hướng Dẫn Import Cho Kế Toán
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-blue-600 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
              {IMPORT_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <div className="flex flex-col gap-3 border-t border-blue-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Tải file mẫu đúng định dạng để tránh lỗi header và cấu trúc dữ
                liệu.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={onDownloadTemplate}
                disabled={downloadingTemplate || disabled}
              >
                {downloadingTemplate ? (
                  <>
                    <Loader2
                      data-icon="inline-start"
                      className="h-4 w-4 animate-spin"
                    />
                    Đang tải mẫu...
                  </>
                ) : (
                  <>
                    <Download data-icon="inline-start" className="h-4 w-4" />
                    Export File Mẫu
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
