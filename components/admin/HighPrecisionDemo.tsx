"use client";

import React, { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatHighPrecisionNumber,
  parseHighPrecisionNumber,
  formatCoefficient,
  formatTimeValue,
  smartFormatNumber,
  validateDecimal15_10,
  FIELD_PRECISION_CONFIG,
} from "@/lib/utils/high-precision-formatting";
import { Calculator, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface TestResult {
  input: string;
  fieldName: string;
  parsed?: number;
  formatted?: string;
  success: boolean;
  error?: string;
  warnings?: string[];
}

export default function HighPrecisionDemo() {
  const [testInput, setTestInput] = useState("199.9999999999");
  const [selectedField, setSelectedField] = useState("he_so_lam_viec");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sample test cases
  const sampleTestCases = [
    {
      input: "199.9999999999",
      field: "he_so_lam_viec",
      description: "High precision coefficient",
    },
    {
      input: "25.1234567890",
      field: "ngay_cong_trong_gio",
      description: "High precision days",
    },
    {
      input: "150.0000000001",
      field: "gio_cong_tang_ca",
      description: "High precision hours",
    },
    {
      input: "1,234.567890",
      field: "he_so_phu_cap_ket_qua",
      description: "Thousands separator",
    },
    {
      input: "99.99%",
      field: "he_so_luong_co_ban",
      description: "Percentage format",
    },
    {
      input: "1.000,50",
      field: "ngay_cong_trong_gio",
      description: "European decimal format",
    },
    {
      input: "100000.1",
      field: "he_so_lam_viec",
      description: "Value exceeding limit",
    },
    {
      input: "-5.5",
      field: "gio_cong_tang_ca",
      description: "Negative value (should fail)",
    },
  ];

  const runSingleTest = () => {
    setIsLoading(true);

    try {
      const result = parseHighPrecisionNumber(testInput, selectedField);
      const formatted =
        result.success && result.value !== undefined
          ? smartFormatNumber(result.value, selectedField)
          : undefined;

      const testResult: TestResult = {
        input: testInput,
        fieldName: selectedField,
        parsed: result.value,
        formatted,
        success: result.success,
        error: result.error,
        warnings: result.warnings,
      };

      setTestResults((prev) => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
    } catch (error) {
      const testResult: TestResult = {
        input: testInput,
        fieldName: selectedField,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      setTestResults((prev) => [testResult, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllSampleTests = () => {
    setIsLoading(true);
    const results: TestResult[] = [];

    sampleTestCases.forEach((testCase) => {
      try {
        const result = parseHighPrecisionNumber(testCase.input, testCase.field);
        const formatted =
          result.success && result.value !== undefined
            ? smartFormatNumber(result.value, testCase.field)
            : undefined;

        results.push({
          input: testCase.input,
          fieldName: testCase.field,
          parsed: result.value,
          formatted,
          success: result.success,
          error: result.error,
          warnings: result.warnings,
        });
      } catch (error) {
        results.push({
          input: testCase.input,
          fieldName: testCase.field,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    setTestResults(results);
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (success: boolean, warnings?: string[]) => {
    if (!success) return <XCircle className="h-4 w-4 text-red-500" />;
    if (warnings && warnings.length > 0)
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (success: boolean, warnings?: string[]) => {
    if (!success) return <Badge variant="destructive">Failed</Badge>;
    if (warnings && warnings.length > 0)
      return <Badge variant="secondary">Warning</Badge>;
    return (
      <Badge variant="default" className="bg-green-600">
        Success
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            High Precision Number Testing
          </CardTitle>
          <CardDescription>
            Test và demo hệ thống xử lý số có precision cao (lên đến 10 chữ số
            thập phân) cho hệ thống lương MAY HÒA THỌ ĐIỆN BÀN
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="space-y-4">
            <TabsList>
              <TabsTrigger value="single">Single Test</TabsTrigger>
              <TabsTrigger value="batch">Batch Test</TabsTrigger>
              <TabsTrigger value="config">Field Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-input">Test Value</Label>
                  <Input
                    id="test-input"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter number to test (e.g., 199.9999999999)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-select">Field Type</Label>
                  <select
                    id="field-select"
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {Object.keys(FIELD_PRECISION_CONFIG).map((field) => (
                      <option key={field} value={field}>
                        {field} ({FIELD_PRECISION_CONFIG[field].fieldType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={runSingleTest} disabled={isLoading}>
                  {isLoading ? "Testing..." : "Run Test"}
                </Button>
                <Button variant="outline" onClick={clearResults}>
                  Clear Results
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="batch" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Batch test sẽ chạy tất cả các test cases mẫu để kiểm tra các
                  tình huống khác nhau
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium">Sample Test Cases:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {sampleTestCases.map((testCase, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      <div className="font-mono">{testCase.input}</div>
                      <div className="text-gray-600">{testCase.field}</div>
                      <div className="text-xs text-gray-500">
                        {testCase.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={runAllSampleTests} disabled={isLoading}>
                {isLoading ? "Running Tests..." : "Run All Sample Tests"}
              </Button>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Field Precision Configuration:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(FIELD_PRECISION_CONFIG).map(
                    ([fieldName, config]) => (
                      <Card key={fieldName} className="p-4">
                        <div className="space-y-2">
                          <div className="font-mono text-sm font-medium">
                            {fieldName}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div>
                              Type:{" "}
                              <Badge variant="outline">
                                {config.fieldType}
                              </Badge>
                            </div>
                            <div>Max Decimals: {config.maxDecimalPlaces}</div>
                            <div>
                              Max Integer Digits: {config.maxIntegerDigits}
                            </div>
                            <div>
                              Allow Negative:{" "}
                              {config.allowNegative ? "Yes" : "No"}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ),
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Kết quả test parsing và formatting với precision cao
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success, result.warnings)}
                      <span className="font-mono text-sm">{result.input}</span>
                      <Badge variant="outline">{result.fieldName}</Badge>
                      {getStatusBadge(result.success, result.warnings)}
                    </div>
                  </div>

                  {result.success && result.parsed !== undefined && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Parsed Value:</span>
                        <div className="font-mono">{result.parsed}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Formatted Display:
                        </span>
                        <div className="font-mono">{result.formatted}</div>
                      </div>
                    </div>
                  )}

                  {result.error && (
                    <Alert>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-600">
                        {result.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {result.warnings && result.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-yellow-600">
                        Warnings: {result.warnings.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
