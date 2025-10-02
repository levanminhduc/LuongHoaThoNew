"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Settings,
  TrendingUp,
  Database,
  FileSpreadsheet,
} from "lucide-react";

export interface ColumnAnalysis {
  excelColumn: string;
  databaseField?: string;
  confidence: number;
  status: "mapped" | "needs_review" | "unmapped";
  suggestedAction: string;
  mappingType?: "exact" | "fuzzy" | "alias" | "manual";
  matchedAlias?: string;
}

export interface AnalysisResult {
  totalColumns: number;
  mappedColumns: number;
  needsReviewColumns: number;
  unmappedColumns: number;
  mappingSuccessRate: number;
  columnDetails: ColumnAnalysis[];
  fileName: string;
  configurationUsed?: string;
  mappingTypeStats?: {
    exactMatches: number;
    aliasMatches: number;
    fuzzyMatches: number;
    manualMatches: number;
  };
  aliasesUsed?: number;
}

interface ColumnMappingAnalysisProps {
  analysisResult: AnalysisResult;
  onFixMapping?: () => void;
  onProceedImport?: () => void;
  onReanalyze?: () => void;
}

export function ColumnMappingAnalysis({
  analysisResult,
  onFixMapping,
  onProceedImport,
  onReanalyze,
}: ColumnMappingAnalysisProps) {
  const {
    totalColumns,
    mappedColumns,
    needsReviewColumns,
    unmappedColumns,
    mappingSuccessRate,
    columnDetails,
    fileName,
    configurationUsed,
    mappingTypeStats,
    aliasesUsed,
  } = analysisResult;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "mapped":
        return "text-green-600 bg-green-50 border-green-200";
      case "needs_review":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "unmapped":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "mapped":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "needs_review":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "unmapped":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  // Get confidence badge variant
  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return "default";
    if (confidence >= 50) return "secondary";
    return "destructive";
  };

  // Get overall status
  const getOverallStatus = () => {
    if (mappingSuccessRate >= 90)
      return {
        status: "excellent",
        color: "text-green-600",
        message: "Excellent mapping quality",
      };
    if (mappingSuccessRate >= 70)
      return {
        status: "good",
        color: "text-blue-600",
        message: "Good mapping quality",
      };
    if (mappingSuccessRate >= 50)
      return {
        status: "fair",
        color: "text-yellow-600",
        message: "Fair mapping quality",
      };
    return {
      status: "poor",
      color: "text-red-600",
      message: "Poor mapping quality - needs attention",
    };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Column Mapping Analysis
          </h3>
          <p className="text-sm text-gray-600">
            File: <span className="font-medium">{fileName}</span>
            {configurationUsed && (
              <span className="ml-2">
                • Configuration:{" "}
                <span className="font-medium">{configurationUsed}</span>
              </span>
            )}
            {aliasesUsed !== undefined && (
              <span className="ml-2">
                • Aliases Available:{" "}
                <span className="font-medium">{aliasesUsed}</span>
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onReanalyze}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Re-analyze
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalColumns}
            </div>
            <div className="text-sm text-gray-600">Total Columns</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {mappedColumns}
            </div>
            <div className="text-sm text-gray-600">Mapped Successfully</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {needsReviewColumns}
            </div>
            <div className="text-sm text-gray-600">Needs Review</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {unmappedColumns}
            </div>
            <div className="text-sm text-gray-600">Unmapped</div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className={`h-5 w-5 ${overallStatus.color}`} />
              <div>
                <div className="font-medium">Mapping Success Rate</div>
                <div className={`text-sm ${overallStatus.color}`}>
                  {overallStatus.message}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${overallStatus.color}`}>
                {mappingSuccessRate.toFixed(1)}%
              </div>
            </div>
          </div>
          <Progress value={mappingSuccessRate} className="mt-3" />
        </CardContent>
      </Card>

      {/* Mapping Type Breakdown */}
      {mappingTypeStats && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-blue-600" />
              <div className="font-medium">Mapping Type Breakdown</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">
                  {mappingTypeStats.exactMatches}
                </div>
                <div className="text-xs text-green-600">Exact Matches</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">
                  {mappingTypeStats.aliasMatches}
                </div>
                <div className="text-xs text-blue-600">Alias Matches</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="text-lg font-bold text-purple-600">
                  {mappingTypeStats.manualMatches}
                </div>
                <div className="text-xs text-purple-600">Manual Matches</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="text-lg font-bold text-orange-600">
                  {mappingTypeStats.fuzzyMatches}
                </div>
                <div className="text-xs text-orange-600">Fuzzy Matches</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Column Details
          </CardTitle>
          <CardDescription>
            Detailed analysis of each column in your Excel file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {columnDetails.map((column, index) => (
              <div
                key={index}
                className={`p-3 border rounded-lg ${getStatusColor(column.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(column.status)}
                    <div>
                      <div className="font-medium">{column.excelColumn}</div>
                      {column.databaseField && (
                        <div className="text-sm opacity-75">
                          → {column.databaseField}
                          {column.matchedAlias && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 rounded">
                              via alias: {column.matchedAlias}
                            </span>
                          )}
                          {column.mappingType === "exact" && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1 rounded">
                              exact match
                            </span>
                          )}
                          {column.mappingType === "fuzzy" && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1 rounded">
                              fuzzy match
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {column.mappingType && (
                      <Badge variant="outline" className="text-xs">
                        {column.mappingType}
                      </Badge>
                    )}
                    <Badge
                      variant={getConfidenceBadgeVariant(column.confidence)}
                      className="text-xs"
                    >
                      {column.confidence}%
                    </Badge>
                  </div>
                </div>

                <div className="mt-2 text-sm opacity-75">
                  <strong>Suggested Action:</strong> {column.suggestedAction}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {needsReviewColumns > 0 || unmappedColumns > 0 ? (
          <Button onClick={onFixMapping} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Fix Mapping Issues
          </Button>
        ) : (
          <Button onClick={onProceedImport} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Proceed with Import
          </Button>
        )}
      </div>

      {/* Warnings */}
      {(needsReviewColumns > 0 || unmappedColumns > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong>{" "}
            {needsReviewColumns + unmappedColumns} columns need attention before
            import. Please review and fix mapping issues to ensure data
            accuracy.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
