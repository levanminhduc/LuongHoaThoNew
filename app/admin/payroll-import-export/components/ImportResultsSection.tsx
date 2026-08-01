"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { ImportResultSummary } from "@/components/admin/import-export-widgets";
import ImportErrorModal from "@/components/payroll-import/ImportErrorModal";
import { useExportImportErrorsMutation } from "@/lib/hooks/use-payroll-import";
import type { ImportResult } from "../import-types";

interface ImportResultsSectionProps {
  results: ImportResult;
}

export function ImportResultsSection({ results }: ImportResultsSectionProps) {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const exportImportErrorsMutation = useExportImportErrorsMutation();

  const errors = results.errors ?? [];
  const hasErrors = errors.length > 0;

  const handleExportErrors = async () => {
    try {
      await exportImportErrorsMutation.mutateAsync({
        errors: errors.map((err) => ({
          row: err.row,
          column: err.field,
          field: err.field,
          currentValue: err.employee_id || err.salary_month,
          errorType: err.errorType || "validation",
          severity: "medium",
          message: err.error,
        })),
        format: "excel",
        fileName: "import_errors",
      });
    } catch (exportErr) {
      console.error("Export error:", exportErr);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <ImportResultSummary
        totalRecords={results.totalRecords}
        successCount={results.successCount}
        errorCount={results.errorCount}
        skippedCount={results.skippedCount}
        overwriteCount={results.overwriteCount}
        processingTime={results.processingTime}
        onViewErrors={hasErrors ? () => setShowErrorModal(true) : undefined}
      />

      {hasErrors && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <h4 className="font-medium text-red-700">
                Chi Tiết Lỗi ({errors.length} lỗi)
              </h4>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowErrorModal(true)}
                  className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Eye data-icon="inline-start" className="h-4 w-4" />
                  Xem Chi Tiết
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportErrors}
                  disabled={exportImportErrorsMutation.isPending}
                  className="w-full sm:w-auto text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Download data-icon="inline-start" className="h-4 w-4" />
                  Tải Báo Cáo Lỗi Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasErrors && (
        <ImportErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          errors={errors}
          totalRecords={results.totalRecords}
          successCount={results.successCount}
          skippedCount={results.skippedCount}
          originalHeaders={results.originalHeaders}
        />
      )}
    </div>
  );
}
