"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { ImportPreviewSection } from "./components/ImportPreviewSection";
import { ImportResultsSection } from "./components/ImportResultsSection";
import { ImportProgress } from "@/components/admin/import-export-widgets";
import { useImportPayrollMutation } from "@/lib/hooks/use-payroll-import";
import type { ImportResult, ImportStatus } from "./import-types";

export default function PayrollImportPage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importBatchId, setImportBatchId] = useState<string>("");
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");

  const importPayrollMutation = useImportPayrollMutation();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError("");
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn file để import");
      return;
    }

    setLoading(true);
    setImportStatus("processing");
    setError("");
    setMessage("");
    setProgress(0);
    setResults(null);
    setImportBatchId("");

    try {
      setImportStatus("importing");
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await importPayrollMutation.mutateAsync(formData);

      clearInterval(progressInterval);
      setProgress(100);

      const importResult = result as {
        success?: boolean;
        data?: Partial<ImportResult> & { importBatchId?: string };
        importErrors?: ImportResult["errors"];
        originalHeaders?: string[];
        metadata?: {
          skippedCount?: number;
          importBatchId?: string;
        };
        message?: string;
        importBatchId?: string;
      };
      const importData = (importResult.data ||
        importResult) as Partial<ImportResult> & {
        importBatchId?: string;
      };
      const importErrors = importResult.importErrors || importData.errors || [];
      const originalHeaders =
        importResult.originalHeaders || importData.originalHeaders || [];

      const resultWithErrors: ImportResult = {
        ...(importData as ImportResult),
        errors: importErrors,
        originalHeaders,
        skippedCount:
          importResult.metadata?.skippedCount || importData.skippedCount || 0,
      };

      setResults(resultWithErrors);
      if (importResult.success) {
        setMessage(importResult.message || "Import thành công!");
        setImportStatus("complete");
      } else {
        setMessage(importResult.message || "Import hoàn tất với một số lỗi");
        setImportStatus(importErrors.length > 0 ? "error" : "complete");
      }

      const batchId =
        importData.importBatchId ||
        importResult.importBatchId ||
        importResult.metadata?.importBatchId;
      if (batchId) {
        setImportBatchId(batchId);
      }
    } catch (error) {
      console.error("Import error:", error);
      setError(error instanceof Error ? error.message : "Lỗi khi import");
      setImportStatus("error");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setResults(null);
    setError("");
    setMessage("");
    setProgress(0);
    setImportStatus("idle");
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          Import Lương Nhân Viên
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Upload file Excel để import dữ liệu lương vào hệ thống
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            Import Dữ Liệu Lương
          </CardTitle>
          <CardDescription>
            Chọn file Excel đúng định dạng template để đưa dữ liệu lương vào hệ
            thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="file-input">Chọn File Excel</Label>
            <Input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={loading}
            />
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{selectedFile.name}</span>
                <Badge variant="outline">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </div>
            )}
          </div>

          {loading && (
            <ImportProgress
              fileName={selectedFile?.name}
              progress={progress}
              status={importStatus}
              message="Đang import dữ liệu lương..."
            />
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={handleImport}
              disabled={!selectedFile || loading}
              className="flex items-center gap-2 px-8 w-full sm:w-auto"
            >
              {loading ? (
                <RefreshCw
                  data-icon="inline-start"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <Upload data-icon="inline-start" className="h-4 w-4" />
              )}
              {loading ? "Đang Import..." : "Bắt Đầu Import"}
            </Button>

            {(selectedFile || results) && (
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={loading}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw data-icon="inline-start" className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm sm:text-base">
              <strong>Quy tắc Import:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>
                  • <strong>Overwrite Logic:</strong> Nếu record đã tồn tại
                  (cùng mã NV + tháng lương) sẽ được ghi đè hoàn toàn
                </li>
                <li>
                  • <strong>Validation:</strong> Mã nhân viên phải tồn tại trong
                  hệ thống
                </li>
                <li>
                  • <strong>Format:</strong> Tháng lương phải có định dạng
                  YYYY-MM (ví dụ: 2024-01)
                </li>
                <li>
                  • <strong>File Size:</strong> Hỗ trợ tối đa 5000 rows
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div role="status" aria-live="polite" aria-atomic="true">
        {message && (
          <Alert role="presentation" className="mt-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && <ImportResultsSection results={results} />}

      {results && results.successCount > 0 && importBatchId && (
        <ImportPreviewSection
          importBatchId={importBatchId}
          totalRecords={results.totalRecords}
          successCount={results.successCount}
        />
      )}
    </div>
  );
}
