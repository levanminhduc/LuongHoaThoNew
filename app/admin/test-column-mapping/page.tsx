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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  TestTube,
  Database,
} from "lucide-react";
import {
  autoMapColumnsWithAliases,
  PAYROLL_FIELD_CONFIG,
} from "@/lib/advanced-excel-parser";
import {
  type ColumnAlias,
  type ImportMappingResult,
} from "@/lib/column-alias-config";
import {
  EnhancedImportValidator,
  type ValidationResult,
} from "@/lib/enhanced-import-validation";

// Test data for column mapping
const TEST_EXCEL_COLUMNS = [
  "Mã Nhân Viên",
  "Tháng Lương",
  "Lương Cơ Bản",
  "Hệ Số LV",
  "PC Vượt Giờ",
  "Thuế TNCN",
  "BHXH NV",
  "Thực Nhận",
  "Unknown Column",
  "Mysterious Data",
];

const TEST_PROBLEMATIC_COLUMNS = [
  "Employee Code", // Should map to employee_id
  "Salary Period", // Should map to salary_month
  "Base Pay", // Should map to luong_co_ban
  "Work Factor", // Should map to he_so_lam_viec
  "OT Allowance", // Should map to phu_cap_vuot_gio
  "Tax", // Should map to thue_thu_nhap_ca_nhan
  "Social Insurance", // Should map to bao_hiem_xa_hoi_nv_dong
  "Net Pay", // Should map to tien_luong_thuc_nhan_cuoi_ky
  "Random Column 1",
  "Random Column 2",
];

export default function TestColumnMappingPage() {
  const [loading, setLoading] = useState(false);
  const [aliases, setAliases] = useState<ColumnAlias[]>([]);
  const [testResults, setTestResults] = useState<{
    basic: ImportMappingResult | null;
    problematic: ImportMappingResult | null;
    validation: ValidationResult | null;
  }>({
    basic: null,
    problematic: null,
    validation: null,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    loadAliases();
  }, [router]);

  const loadAliases = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        "/api/admin/column-aliases?limit=200&is_active=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();
      if (result.success) {
        setAliases(result.data || []);
        setMessage(`Loaded ${result.data?.length || 0} aliases`);
      } else {
        throw new Error(result.message || "Failed to load aliases");
      }
    } catch (error) {
      console.error("Error loading aliases:", error);
      setError("Failed to load aliases");
    }
  };

  const runBasicTest = async () => {
    setLoading(true);
    try {
      const result = await autoMapColumnsWithAliases(
        TEST_EXCEL_COLUMNS,
        aliases,
      );
      setTestResults((prev) => ({ ...prev, basic: result }));
      setMessage("Basic test completed successfully");
    } catch (error) {
      console.error("Basic test error:", error);
      setError("Basic test failed");
    } finally {
      setLoading(false);
    }
  };

  const runProblematicTest = async () => {
    setLoading(true);
    try {
      const result = await autoMapColumnsWithAliases(
        TEST_PROBLEMATIC_COLUMNS,
        aliases,
      );
      setTestResults((prev) => ({ ...prev, problematic: result }));
      setMessage("Problematic test completed successfully");
    } catch (error) {
      console.error("Problematic test error:", error);
      setError("Problematic test failed");
    } finally {
      setLoading(false);
    }
  };

  const runValidationTest = async () => {
    if (!testResults.basic) {
      setError("Run basic test first");
      return;
    }

    setLoading(true);
    try {
      const validator = new EnhancedImportValidator(aliases);
      const validation = validator.validateMapping(
        TEST_EXCEL_COLUMNS,
        testResults.basic.mapping,
      );
      setTestResults((prev) => ({ ...prev, validation }));
      setMessage("Validation test completed successfully");
    } catch (error) {
      console.error("Validation test error:", error);
      setError("Validation test failed");
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Run basic test
      const basicResult = await autoMapColumnsWithAliases(
        TEST_EXCEL_COLUMNS,
        aliases,
      );

      // Run problematic test
      const problematicResult = await autoMapColumnsWithAliases(
        TEST_PROBLEMATIC_COLUMNS,
        aliases,
      );

      // Run validation test
      const validator = new EnhancedImportValidator(aliases);
      const validationResult = validator.validateMapping(
        TEST_EXCEL_COLUMNS,
        basicResult.mapping,
      );

      setTestResults({
        basic: basicResult,
        problematic: problematicResult,
        validation: validationResult,
      });

      setMessage("All tests completed successfully");
    } catch (error) {
      console.error("Test suite error:", error);
      setError("Test suite failed");
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getMappingTypeColor = (type: string) => {
    switch (type) {
      case "exact":
        return "bg-blue-100 text-blue-800";
      case "alias":
        return "bg-purple-100 text-purple-800";
      case "fuzzy":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
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
            Test Column Mapping System
          </h1>
          <p className="text-gray-600 mt-2">
            Test và kiểm tra hệ thống column mapping với aliases
          </p>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-blue-600" />
              Test Controls
            </CardTitle>
            <CardDescription>
              Chạy các test để kiểm tra hệ thống column mapping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={runBasicTest}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Basic Test
              </Button>

              <Button
                onClick={runProblematicTest}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Problematic Test
              </Button>

              <Button
                onClick={runValidationTest}
                disabled={loading || !testResults.basic}
                variant="outline"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Validation Test
              </Button>

              <Button
                onClick={runAllTests}
                disabled={loading}
                variant="default"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Run All Tests
              </Button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Aliases loaded:</strong> {aliases.length}
              </p>
              <p>
                <strong>Database fields:</strong> {PAYROLL_FIELD_CONFIG.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Test</TabsTrigger>
            <TabsTrigger value="problematic">Problematic Test</TabsTrigger>
            <TabsTrigger value="validation">Validation Test</TabsTrigger>
          </TabsList>

          {/* Basic Test Results */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Test Results</CardTitle>
                <CardDescription>
                  Test với các cột Excel tiếng Việt chuẩn
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.basic ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {testResults.basic.confidence_summary.high_confidence}
                        </div>
                        <div className="text-sm text-green-600">
                          High Confidence
                        </div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-700">
                          {
                            testResults.basic.confidence_summary
                              .medium_confidence
                          }
                        </div>
                        <div className="text-sm text-yellow-600">
                          Medium Confidence
                        </div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-700">
                          {testResults.basic.confidence_summary.low_confidence}
                        </div>
                        <div className="text-sm text-red-600">
                          Low Confidence
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-700">
                          {testResults.basic.confidence_summary.manual_required}
                        </div>
                        <div className="text-sm text-gray-600">
                          Manual Required
                        </div>
                      </div>
                    </div>

                    {/* Mappings */}
                    <div className="space-y-2">
                      <h4 className="font-semibold">Column Mappings:</h4>
                      {Object.entries(testResults.basic.mapping).map(
                        ([column, config]) => (
                          <div
                            key={column}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                          >
                            <div>
                              <span className="font-medium">{column}</span>
                              <span className="text-gray-500 mx-2">→</span>
                              <span>
                                {
                                  PAYROLL_FIELD_CONFIG.find(
                                    (f) => f.field === config.database_field,
                                  )?.label
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getMappingTypeColor(
                                  config.mapping_type,
                                )}
                              >
                                {config.mapping_type}
                              </Badge>
                              <Badge
                                className={getConfidenceColor(
                                  config.confidence_score,
                                )}
                              >
                                {config.confidence_score}%
                              </Badge>
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    {/* Unmapped */}
                    {testResults.basic.unmapped_columns.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-orange-700">
                          Unmapped Columns:
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {testResults.basic.unmapped_columns.map((column) => (
                            <Badge
                              key={column}
                              variant="outline"
                              className="text-orange-700"
                            >
                              {column}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {`Chưa có kết quả test. Nhấn "Basic Test" để bắt đầu.`}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Similar structure for other tabs... */}
          <TabsContent value="problematic">
            <Card>
              <CardHeader>
                <CardTitle>Problematic Test Results</CardTitle>
                <CardDescription>
                  Test với các cột Excel tiếng Anh và tên không chuẩn
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.problematic ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Test columns: {TEST_PROBLEMATIC_COLUMNS.join(", ")}
                    </div>
                    <div className="text-sm">
                      <strong>Mapped:</strong>{" "}
                      {Object.keys(testResults.problematic.mapping).length} /{" "}
                      {TEST_PROBLEMATIC_COLUMNS.length}
                    </div>
                    <div className="text-sm">
                      <strong>Success:</strong>{" "}
                      {testResults.problematic.success ? "✅ Yes" : "❌ No"}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {`Chưa có kết quả test. Nhấn "Problematic Test" để bắt đầu.`}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation">
            <Card>
              <CardHeader>
                <CardTitle>Validation Test Results</CardTitle>
                <CardDescription>
                  Kết quả validation và error detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.validation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">
                          {testResults.validation.summary.mapped_columns}
                        </div>
                        <div className="text-sm text-blue-600">
                          Mapped Columns
                        </div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-700">
                          {testResults.validation.summary.critical_errors}
                        </div>
                        <div className="text-sm text-red-600">
                          Critical Errors
                        </div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-700">
                          {testResults.validation.summary.warnings}
                        </div>
                        <div className="text-sm text-yellow-600">Warnings</div>
                      </div>
                    </div>

                    <div className="text-lg font-semibold">
                      Validation Status:{" "}
                      {testResults.validation.isValid ? (
                        <span className="text-green-600">✅ Valid</span>
                      ) : (
                        <span className="text-red-600">❌ Invalid</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {`Chưa có kết quả validation. Chạy Basic Test trước, sau đó nhấn "Validation Test".`}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
