"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Eye,
  Search,
} from "lucide-react";
import {
  ExportConfigurationDialog,
  type ExportOptions,
} from "@/components/export-configuration-dialog";
import {
  ColumnMappingAnalysis,
  type AnalysisResult,
  type ColumnAnalysis,
} from "@/components/column-mapping-analysis";
import {
  detectColumns,
  autoMapColumnsWithAliases,
} from "@/lib/advanced-excel-parser";
import {
  useMappingConfig,
  useAutoLoadConfigurations,
} from "@/lib/hooks/use-mapping-config";
import { ImportPreviewSection } from "./components/ImportPreviewSection";
import ImportErrorModal from "@/components/payroll-import/ImportErrorModal";
import {
  ImportProgress,
  ImportResultSummary,
} from "@/components/ui/import-export-widgets";
import * as XLSX from "xlsx";

type ImportStatus =
  | "idle"
  | "processing"
  | "validating"
  | "importing"
  | "complete"
  | "error";

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  overwriteCount?: number;
  skippedCount?: number;
  errors?: Array<{
    row: number;
    field?: string;
    employee_id?: string;
    salary_month?: string;
    errorType:
      | "validation"
      | "duplicate"
      | "employee_not_found"
      | "database"
      | "format";
    error: string;
    originalData?: Record<string, unknown>;
  }>;
  processingTime: string;
  importBatchId?: string;
  originalHeaders?: string[];
}

export default function PayrollImportExportPage() {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportType, setExportType] = useState<"template" | "data">("template");
  const [importBatchId, setImportBatchId] = useState<string>("");
  const [salaryMonth, setSalaryMonth] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Analysis states
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(
    null,
  );
  const [analysisError, setAnalysisError] = useState("");

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");

  const router = useRouter();
  const { configurations, defaultConfig } = useMappingConfig();

  // Auto-load configurations
  useAutoLoadConfigurations();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
  }, [router]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError("");
      setResults(null);
    }
  };

  const handleExport = async (options?: ExportOptions) => {
    if (!options) {
      // Open export dialog if no options provided
      setShowExportDialog(true);
      return;
    }

    setExportLoading(true);
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      const params = new URLSearchParams({
        includeData: options.includeData ? "true" : "false",
      });

      if (options.includeData && options.salaryMonth) {
        params.append("salaryMonth", options.salaryMonth);
      }

      if (options.configId) {
        params.append("configId", options.configId.toString());
      }

      const response = await fetch(
        `/api/admin/payroll-export-template?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi khi tải template");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Use custom filename if provided, otherwise generate one
      const filename =
        options.customFilename ||
        (() => {
          const timestamp = new Date().toISOString().slice(0, 10);
          const configSuffix = options.configId ? "-with-config" : "";
          return options.includeData
            ? `luong-export-${options.salaryMonth || "all"}${configSuffix}-${timestamp}.xlsx`
            : `template-luong${configSuffix}-${timestamp}.xlsx`;
        })();

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const configInfo = options.configId ? " với mapping configuration" : "";
      setMessage(
        `Đã tải ${options.includeData ? "dữ liệu" : "template"}${configInfo} thành công!`,
      );
    } catch (error) {
      console.error("Export error:", error);
      setError(error instanceof Error ? error.message : "Lỗi khi export");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle generate template from configuration
  const handleGenerateConfigTemplate = () => {
    setShowExportDialog(true);
  };

  // Generate template from Column Aliases
  const handleGenerateAliasTemplate = async () => {
    try {
      setExportLoading(true);
      setError("");

      const token = localStorage.getItem("admin_token");
      if (!token) {
        setError("Không tìm thấy token xác thực");
        return;
      }

      const response = await fetch("/api/admin/generate-alias-template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi khi tạo template từ aliases");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `template-luong-aliases-${timestamp}.xlsx`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Get alias statistics from response headers
      const totalAliases = response.headers.get("X-Total-Aliases") || "0";
      const fieldsWithAliases =
        response.headers.get("X-Fields-With-Aliases") || "0";
      const aliasCoverage = response.headers.get("X-Alias-Coverage") || "0%";

      setMessage(`Template từ Column Aliases đã được tạo thành công!
        Sử dụng ${totalAliases} aliases cho ${fieldsWithAliases} fields (${aliasCoverage} coverage)`);
    } catch (error) {
      console.error("Generate alias template error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Lỗi khi tạo template từ Column Aliases",
      );
    } finally {
      setExportLoading(false);
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
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      setImportStatus("importing");
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/admin/payroll-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();

      if (response.ok) {
        const importData = result.data || result;
        const importErrors = result.importErrors || importData.errors || [];
        const originalHeaders =
          result.originalHeaders || importData.originalHeaders || [];

        const resultWithErrors: ImportResult = {
          ...importData,
          errors: importErrors,
          originalHeaders,
          skippedCount:
            result.metadata?.skippedCount || importData.skippedCount || 0,
        };

        if (result.success) {
          setResults(resultWithErrors);
          setMessage(result.message || "Import thành công!");
          setImportStatus("complete");
          const batchId =
            result.data?.importBatchId ||
            result.importBatchId ||
            result.metadata?.importBatchId;
          if (batchId) {
            setImportBatchId(batchId);
          }
        } else {
          setResults(resultWithErrors);
          setMessage(result.message || "Import hoàn tất với một số lỗi");
          setImportStatus(importErrors.length > 0 ? "error" : "complete");
          const batchId =
            result.data?.importBatchId ||
            result.importBatchId ||
            result.metadata?.importBatchId;
          if (batchId) {
            setImportBatchId(batchId);
          }
        }
      } else {
        throw new Error(
          result.error?.message || result.message || "Import thất bại",
        );
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

  // Analysis functions
  const handleAnalysisFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setAnalysisFile(file);
      setAnalysisError("");
      setAnalysisResults(null);
    }
  };

  // Load Column Aliases from API
  const loadColumnAliasesFromAPI = async () => {
    try {
      // Check if we're in browser environment
      if (
        typeof window === "undefined" ||
        typeof localStorage === "undefined"
      ) {
        return [];
      }

      const token = localStorage.getItem("admin_token");
      if (!token) {
        console.warn("No admin token found for loading aliases");
        return [];
      }

      const response = await fetch(
        "/api/admin/column-aliases?limit=200&is_active=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      if (result.success) {
        console.log(
          `Loaded ${result.data?.length || 0} column aliases for analysis`,
        );
        return result.data || [];
      } else {
        throw new Error(result.message || "Failed to load aliases");
      }
    } catch (error) {
      console.error("Error loading column aliases:", error);
      // Return empty array instead of throwing to allow analysis to continue
      return [];
    }
  };

  const analyzeFile = async (file: File) => {
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisResults(null);

    try {
      // Read Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Detect columns
      const detectedColumns = detectColumns(worksheet);

      if (detectedColumns.length === 0) {
        throw new Error("Không tìm thấy cột nào trong file Excel");
      }

      // Load Column Aliases from API
      const aliases = await loadColumnAliasesFromAPI();

      // Get current mapping configuration
      const currentConfig =
        defaultConfig || configurations.find((c) => c.is_default);

      // Auto-map columns with loaded aliases
      const mappingResult = await autoMapColumnsWithAliases(
        detectedColumns,
        aliases, // Use loaded aliases instead of empty array
        currentConfig,
      );

      // Process results into analysis format
      const columnDetails: ColumnAnalysis[] = detectedColumns.map((column) => {
        const mapping = mappingResult.mapping[column];

        if (mapping) {
          const status =
            mapping.confidence_score >= 80
              ? "mapped"
              : mapping.confidence_score >= 50
                ? "needs_review"
                : "unmapped";

          return {
            excelColumn: column,
            databaseField: mapping.database_field,
            confidence: mapping.confidence_score,
            status,
            mappingType: mapping.mapping_type,
            matchedAlias: mapping.matched_alias?.alias_name,
            suggestedAction: getSuggestedAction(
              status,
              mapping.confidence_score,
              mapping.mapping_type,
            ),
          };
        } else {
          return {
            excelColumn: column,
            confidence: 0,
            status: "unmapped",
            suggestedAction: "Create manual mapping or add column alias",
          };
        }
      });

      // Calculate detailed statistics
      const mappedColumnsCount = columnDetails.filter(
        (c) => c.status === "mapped",
      ).length;
      const needsReviewColumnsCount = columnDetails.filter(
        (c) => c.status === "needs_review",
      ).length;
      const unmappedColumnsCount = columnDetails.filter(
        (c) => c.status === "unmapped",
      ).length;
      const mappingSuccessRate =
        (mappedColumnsCount / detectedColumns.length) * 100;

      // Calculate mapping type statistics for better insights
      const exactMatches = columnDetails.filter(
        (c) => c.mappingType === "exact",
      ).length;
      const aliasMatches = columnDetails.filter(
        (c) => c.mappingType === "alias",
      ).length;
      const fuzzyMatches = columnDetails.filter(
        (c) => c.mappingType === "fuzzy",
      ).length;
      const manualMatches = columnDetails.filter(
        (c) => c.mappingType === "manual",
      ).length;

      const analysisResult: AnalysisResult = {
        totalColumns: detectedColumns.length,
        mappedColumns: mappedColumnsCount,
        needsReviewColumns: needsReviewColumnsCount,
        unmappedColumns: unmappedColumnsCount,
        mappingSuccessRate,
        columnDetails,
        fileName: file.name,
        configurationUsed: currentConfig?.config_name,
        // Add detailed mapping statistics
        mappingTypeStats: {
          exactMatches,
          aliasMatches,
          fuzzyMatches,
          manualMatches,
        },
        aliasesUsed: aliases.length,
      };

      setAnalysisResults(analysisResult);
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisError(
        error instanceof Error ? error.message : "Lỗi khi phân tích file",
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getSuggestedAction = (
    status: string,
    confidence: number,
    mappingType?: string,
  ): string => {
    switch (status) {
      case "mapped":
        if (mappingType === "alias") {
          return confidence >= 95
            ? "Perfect alias match - ready to import"
            : "Good alias match - verify if needed";
        } else if (mappingType === "exact") {
          return "Exact field match - ready to import";
        } else if (mappingType === "configuration") {
          return "Configuration match - ready to import";
        }
        return confidence >= 95
          ? "Perfect match - ready to import"
          : "Good match - verify if needed";
      case "needs_review":
        if (mappingType === "fuzzy") {
          return "Fuzzy match - review accuracy before import";
        }
        return "Review mapping accuracy before import";
      case "unmapped":
        return "Create manual mapping or add column alias";
      default:
        return "Unknown status";
    }
  };

  const handleAnalyzeFile = () => {
    if (analysisFile) {
      analyzeFile(analysisFile);
    }
  };

  const handleFixMapping = () => {
    // TODO: Open mapping configuration dialog
    setMessage("Mapping configuration dialog will be implemented");
  };

  const handleProceedImport = () => {
    if (analysisFile) {
      setSelectedFile(analysisFile);
      setMessage("File moved to import tab - ready for import");
    }
  };

  const handleReanalyze = () => {
    if (analysisFile) {
      analyzeFile(analysisFile);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Import/Export Lương Nhân Viên
          </h1>
          <p className="text-gray-600 mt-2">
            Quản lý dữ liệu lương: Tải template, export dữ liệu và import file
            Excel
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export & Template
            </TabsTrigger>
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Analyze File
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Dữ Liệu
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  Tải Template & Export Dữ Liệu
                </CardTitle>
                <CardDescription>
                  Tải template Excel để import hoặc export dữ liệu lương hiện có
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Type Selection */}
                  <div className="space-y-4">
                    <Label htmlFor="export-type">Loại Export</Label>
                    <Select
                      value={exportType}
                      onValueChange={(value: "template" | "data") =>
                        setExportType(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại export" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="template">
                          <div className="flex flex-col">
                            <span className="font-medium">Template Trống</span>
                            <span className="text-xs text-gray-500">
                              File mẫu với 2 dòng dữ liệu ví dụ
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="data">
                          <div className="flex flex-col">
                            <span className="font-medium">Export Dữ Liệu</span>
                            <span className="text-xs text-gray-500">
                              Xuất dữ liệu lương hiện có
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Salary Month Selection (for data export) */}
                  {exportType === "data" && (
                    <div className="space-y-4">
                      <Label htmlFor="salary-month">
                        Tháng Lương (Tùy chọn)
                      </Label>
                      <Input
                        id="salary-month"
                        type="month"
                        value={salaryMonth}
                        onChange={(e) => setSalaryMonth(e.target.value)}
                        placeholder="Chọn tháng lương"
                      />
                      <p className="text-xs text-gray-500">
                        Để trống để export tất cả dữ liệu
                      </p>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={() => handleExport()}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-8"
                  >
                    {exportLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {exportLoading
                      ? "Đang tạo file..."
                      : `Tải ${exportType === "template" ? "Template" : "Dữ Liệu"}`}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleGenerateConfigTemplate}
                    disabled={exportLoading}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Template từ Config
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleGenerateAliasTemplate}
                    disabled={exportLoading}
                    className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Template từ Aliases
                  </Button>
                </div>

                {/* Export Info */}
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Lưu ý:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>
                        • Template chỉ chứa các cột có dữ liệu trong hệ thống
                      </li>
                      <li>• File Excel sử dụng headers tiếng Việt dễ hiểu</li>
                      <li>
                        • Template có 2 dòng dữ liệu mẫu để tham khảo format
                      </li>
                      <li>
                        • Export dữ liệu sẽ bao gồm tất cả records hoặc theo
                        tháng được chọn
                      </li>
                      <li>
                        • <strong>Template từ Aliases</strong>: Sử dụng Column
                        Aliases đã cấu hình để tạo headers thân thiện
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analyze File Tab */}
          <TabsContent value="analyze">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-purple-600" />
                  Column Mapping Analysis
                </CardTitle>
                <CardDescription>
                  Upload and analyze your Excel file to preview column mapping
                  before import
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload Section */}
                <div className="space-y-4">
                  <Label htmlFor="analysis-file-input">
                    Select Excel File for Analysis
                  </Label>
                  <Input
                    id="analysis-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleAnalysisFileSelect}
                    disabled={analysisLoading}
                  />
                  {analysisFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{analysisFile.name}</span>
                      <Badge variant="outline">
                        {(analysisFile.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Analyze Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleAnalyzeFile}
                    disabled={!analysisFile || analysisLoading}
                    className="flex items-center gap-2 px-8"
                  >
                    {analysisLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {analysisLoading
                      ? "Analyzing..."
                      : "Analyze Column Mapping"}
                  </Button>
                </div>

                {/* Analysis Progress */}
                {analysisLoading && (
                  <div className="space-y-2">
                    <div className="text-sm text-center text-gray-600">
                      Analyzing file structure and column mappings...
                    </div>
                    <Progress value={undefined} className="w-full" />
                  </div>
                )}

                {/* Analysis Results */}
                {analysisResults && (
                  <ColumnMappingAnalysis
                    analysisResult={analysisResults}
                    onFixMapping={handleFixMapping}
                    onProceedImport={handleProceedImport}
                    onReanalyze={handleReanalyze}
                  />
                )}

                {/* Analysis Info */}
                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Analysis Features:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>
                        • <strong>Column Detection:</strong> Automatically
                        detect all columns in your Excel file
                      </li>
                      <li>
                        • <strong>Smart Mapping:</strong> Use AI-powered mapping
                        with confidence scores
                      </li>
                      <li>
                        • <strong>Quality Assessment:</strong> Get detailed
                        analysis of mapping quality
                      </li>
                      <li>
                        • <strong>Issue Identification:</strong> Identify
                        columns that need manual review
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-600" />
                  Import Dữ Liệu Lương
                </CardTitle>
                <CardDescription>
                  Upload file Excel để import dữ liệu lương vào hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Selection */}
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

                {/* Progress Widget */}
                {loading && (
                  <ImportProgress
                    fileName={selectedFile?.name}
                    progress={progress}
                    status={importStatus}
                    message="Đang import dữ liệu lương..."
                  />
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleImport}
                    disabled={!selectedFile || loading}
                    className="flex items-center gap-2 px-8"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {loading ? "Đang Import..." : "Bắt Đầu Import"}
                  </Button>

                  {(selectedFile || results) && (
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </div>

                {/* Import Info */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Quy tắc Import:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>
                        • <strong>Overwrite Logic:</strong> Nếu record đã tồn
                        tại (cùng mã NV + tháng lương) sẽ được ghi đè hoàn toàn
                      </li>
                      <li>
                        • <strong>Validation:</strong> Mã nhân viên phải tồn tại
                        trong hệ thống
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
          </TabsContent>
        </Tabs>

        {/* Messages */}
        {message && (
          <Alert className="mt-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysisError && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Analysis Error:</strong> {analysisError}
            </AlertDescription>
          </Alert>
        )}

        {/* Results Display - Using ImportResultSummary Widget */}
        {results && (
          <div className="mt-6 space-y-4">
            <ImportResultSummary
              totalRecords={results.totalRecords}
              successCount={results.successCount}
              errorCount={results.errorCount}
              skippedCount={results.skippedCount}
              overwriteCount={results.overwriteCount}
              processingTime={results.processingTime}
              onViewErrors={
                results.errors && results.errors.length > 0
                  ? () => setShowErrorModal(true)
                  : undefined
              }
            />

            {/* Error Actions - Export Button */}
            {results.errors && results.errors.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-red-700">
                      Chi Tiết Lỗi ({results.errors.length} lỗi)
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowErrorModal(true)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Xem Chi Tiết
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("admin_token");
                            if (!token || !results.errors) return;

                            const response = await fetch(
                              "/api/admin/export-import-errors",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  errors: results.errors.map((err) => ({
                                    row: err.row,
                                    column: err.field,
                                    field: err.field,
                                    currentValue:
                                      err.employee_id || err.salary_month,
                                    errorType: err.errorType || "validation",
                                    severity: "medium",
                                    message: err.error,
                                  })),
                                  format: "excel",
                                  fileName: "import_errors",
                                }),
                              },
                            );

                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `import_errors_${new Date().toISOString().split("T")[0]}.xlsx`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            }
                          } catch (exportErr) {
                            console.error("Export error:", exportErr);
                          }
                        }}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Tải Báo Cáo Lỗi Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Import Preview Section */}
        {results && results.successCount > 0 && importBatchId && (
          <ImportPreviewSection
            importBatchId={importBatchId}
            totalRecords={results.totalRecords}
            successCount={results.successCount}
          />
        )}

        {/* Export Configuration Dialog */}
        <ExportConfigurationDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          onExport={handleExport}
          availableFields={[
            "employee_id",
            "salary_month",
            "he_so_lam_viec",
            "he_so_phu_cap_ket_qua",
            "he_so_luong_co_ban",
            "luong_toi_thieu_cty",
            "ngay_cong_trong_gio",
            "gio_cong_tang_ca",
            "gio_an_ca",
            "tong_gio_lam_viec",
            "tong_he_so_quy_doi",
            "ngay_cong_chu_nhat",
            "tong_luong_san_pham_cong_doan",
            "don_gia_tien_luong_tren_gio",
            "tien_luong_san_pham_trong_gio",
            "tien_luong_tang_ca",
            "tien_luong_30p_an_ca",
            "tien_luong_chu_nhat",
            "thuong_hieu_qua_lam_viec",
            "thuong_chuyen_can",
            "thuong_khac",
            "phu_cap_tien_an",
            "phu_cap_xang_xe",
            "phu_cap_dien_thoai",
            "phu_cap_khac",
            "pc_luong_cho_viec",
            "luong_cnkcp_vuot",
            "tien_tang_ca_vuot",
            "ngay_cong_phep_le",
            "tien_phep_le",
            "tong_cong_tien_luong",
            "tien_boc_vac",
            "ho_tro_xang_xe",
            "thue_tncn_nam_2024",
            "tam_ung",
            "thue_tncn",
            "bhxh_bhtn_bhyt_total",
            "truy_thu_the_bhyt",
            "tien_luong_thuc_nhan_cuoi_ky",
          ]}
          defaultSalaryMonth={salaryMonth}
        />

        {results && results.errors && results.errors.length > 0 && (
          <ImportErrorModal
            isOpen={showErrorModal}
            onClose={() => setShowErrorModal(false)}
            errors={results.errors}
            totalRecords={results.totalRecords}
            successCount={results.successCount}
            skippedCount={results.skippedCount}
            originalHeaders={results.originalHeaders}
          />
        )}
      </div>
    </div>
  );
}
