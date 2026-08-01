"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hasStoredSession } from "@/lib/auth/secure-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Upload, RefreshCw, Eye } from "lucide-react";
import { getXLSX } from "@/lib/lazy/xlsx";
import {
  ImportProgress,
  ImportResultSummary,
} from "@/components/admin/import-export-widgets";
import ImportErrorModal from "@/components/payroll-import/ImportErrorModal";
import { useBonusImportMutation } from "@/lib/hooks/use-bonus-import";
import { useDownloadTemplateMutation } from "@/lib/hooks/use-bulk-export";
import {
  BonusPeriodSchema,
  EMPLOYEE_ID_COLUMN_CANDIDATES,
  AMOUNT_COLUMN_CANDIDATES,
} from "@/lib/validations/bonus";
import type { BonusType } from "@/lib/validations/bonus";
import { detectColumnByCandidates } from "@/lib/bonus/bonus-import-parser";
import type { BonusImportResult } from "@/lib/bonus/bonus-types";
import { BonusImportForm } from "./components/bonus-import-form";
import { BonusColumnPicker } from "./components/bonus-column-picker";
import { BonusImportGuide } from "./components/bonus-import-guide";

type ImportStatus = "idle" | "importing" | "complete" | "error";

export default function BonusImportPage() {
  const router = useRouter();
  const bonusImportMutation = useBonusImportMutation();
  const bonusTemplateMutation = useDownloadTemplateMutation("bonus");

  const [bonusType, setBonusType] = useState<BonusType | "">("");
  const [bonusPeriod, setBonusPeriod] = useState("");
  const [bonusTitle, setBonusTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<unknown[][]>([]);
  const [employeeIdColumn, setEmployeeIdColumn] = useState("");
  const [amountColumn, setAmountColumn] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BonusImportResult | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    if (!hasStoredSession()) {
      router.push("/admin/login");
    }
  }, [router]);

  const bonusPeriodError = useMemo(() => {
    if (!bonusPeriod) return null;
    const parsed = BonusPeriodSchema.safeParse(bonusPeriod);
    return parsed.success ? null : parsed.error.issues[0].message;
  }, [bonusPeriod]);

  const canImport =
    bonusType !== "" &&
    bonusPeriod !== "" &&
    bonusPeriodError === null &&
    bonusTitle.trim() !== "" &&
    file !== null &&
    employeeIdColumn !== "" &&
    amountColumn !== "" &&
    importStatus !== "importing";

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setImportStatus("idle");

    const XLSX = await getXLSX();
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheet = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as unknown[][];

    const parsedHeaders = ((sheet[0] as unknown[]) ?? []).map((header) =>
      String(header ?? "").trim(),
    );
    setHeaders(parsedHeaders);
    setPreviewRows(sheet.slice(1, 6));
    setEmployeeIdColumn(
      detectColumnByCandidates(parsedHeaders, EMPLOYEE_ID_COLUMN_CANDIDATES),
    );
    setAmountColumn(
      detectColumnByCandidates(parsedHeaders, AMOUNT_COLUMN_CANDIDATES),
    );
  };

  const handleImport = async () => {
    if (!file || bonusType === "") return;

    setImportStatus("importing");
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bonus_type", bonusType);
    formData.append("bonus_period", bonusPeriod);
    formData.append("bonus_title", bonusTitle);
    formData.append("employee_id_column", employeeIdColumn);
    formData.append("amount_column", amountColumn);

    try {
      const data = await bonusImportMutation.mutateAsync(formData);
      setProgress(100);
      setResult(data);
      setImportStatus(data.errorCount > 0 ? "error" : "complete");
    } catch {
      setProgress(0);
      setImportStatus("idle");
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleDownloadTemplate = () => {
    bonusTemplateMutation.mutate(undefined);
  };

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setEmployeeIdColumn("");
    setAmountColumn("");
    setResult(null);
    setProgress(0);
    setImportStatus("idle");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="h-6 w-6 text-pink-600" />
          Import Tiền Thưởng
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Upload các đợt thưởng (Thưởng Lễ / Quý / Nóng). Dữ liệu lưu tĩnh,
          không tính toán lại.
        </p>
      </div>

      <BonusImportGuide
        onDownloadTemplate={handleDownloadTemplate}
        downloadingTemplate={bonusTemplateMutation.isPending}
        disabled={importStatus === "importing"}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            Thông Tin Đợt Thưởng
          </CardTitle>
          <CardDescription>
            Nhập thông tin đợt thưởng và chọn file Excel để import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BonusImportForm
            bonusType={bonusType}
            onBonusTypeChange={setBonusType}
            bonusPeriod={bonusPeriod}
            onBonusPeriodChange={setBonusPeriod}
            bonusPeriodError={bonusPeriodError}
            bonusTitle={bonusTitle}
            onBonusTitleChange={setBonusTitle}
            selectedFile={file}
            onFileSelect={handleFileSelect}
            disabled={importStatus === "importing"}
          />

          {headers.length > 0 && (
            <BonusColumnPicker
              headers={headers}
              previewRows={previewRows}
              employeeIdColumn={employeeIdColumn}
              amountColumn={amountColumn}
              onEmployeeIdColumnChange={setEmployeeIdColumn}
              onAmountColumnChange={setAmountColumn}
              disabled={importStatus === "importing"}
            />
          )}

          {importStatus === "importing" && (
            <ImportProgress
              fileName={file?.name}
              progress={progress}
              status="importing"
              message="Đang import tiền thưởng..."
            />
          )}

          {bonusPeriodError && (
            <p
              role="alert"
              className="text-center text-sm font-medium text-destructive"
            >
              {bonusPeriodError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={handleImport}
              disabled={!canImport}
              aria-invalid={bonusPeriodError ? true : undefined}
              className="flex items-center gap-2 px-8 w-full sm:w-auto"
            >
              {importStatus === "importing" ? (
                <RefreshCw
                  data-icon="inline-start"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <Upload data-icon="inline-start" className="h-4 w-4" />
              )}
              {importStatus === "importing"
                ? "Đang Import..."
                : "Bắt Đầu Import"}
            </Button>

            {(file || result) && (
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={importStatus === "importing"}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw data-icon="inline-start" className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <ImportResultSummary
            totalRecords={result.totalRecords}
            successCount={result.successCount}
            errorCount={result.errorCount}
            skippedCount={result.skippedCount}
            overwriteCount={result.overwriteCount}
            processingTime={result.processingTime}
            onViewErrors={
              result.errors.length > 0
                ? () => setShowErrorModal(true)
                : undefined
            }
          />

          {result.errors.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <h4 className="font-medium text-red-700">
                    Chi Tiết Lỗi ({result.errors.length} lỗi)
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowErrorModal(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Eye data-icon="inline-start" className="h-4 w-4" />
                    Xem Chi Tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {result && result.errors.length > 0 && (
        <ImportErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          errors={result.errors}
          totalRecords={result.totalRecords}
          successCount={result.successCount}
          skippedCount={result.skippedCount}
          originalHeaders={result.originalHeaders}
        />
      )}
    </div>
  );
}
