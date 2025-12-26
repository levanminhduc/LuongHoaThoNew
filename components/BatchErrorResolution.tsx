/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Wand2,
  Undo2,
  Redo2,
  Download,
} from "lucide-react";

interface ImportError {
  row: number;
  column?: string;
  field?: string;
  value?: unknown;
  errorType:
    | "validation"
    | "format"
    | "duplicate"
    | "database"
    | "system"
    | "employee_not_found";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestion?: string;
  expectedFormat?: string;
  currentValue?: string;
}

interface ErrorFix {
  errorIndex: number;
  originalError: ImportError;
  fixType: "manual" | "auto" | "pattern";
  newValue: unknown;
  confidence: "high" | "medium" | "low";
  applied: boolean;
}

interface BatchErrorResolutionProps {
  errors: ImportError[];
  onApplyFixes?: (fixes: ErrorFix[]) => void;
  onExportErrors?: () => void;
  className?: string;
}

export function BatchErrorResolution({
  errors,
  onApplyFixes,
  onExportErrors,
  className = "",
}: BatchErrorResolutionProps) {
  const [selectedErrors, setSelectedErrors] = useState<Set<number>>(new Set());
  const [fixes, setFixes] = useState<ErrorFix[]>([]);
  const [undoStack, setUndoStack] = useState<ErrorFix[][]>([]);
  const [redoStack, setRedoStack] = useState<ErrorFix[][]>([]);
  const [batchFixValue, setBatchFixValue] = useState("");
  const [activeTab, setActiveTab] = useState("errors");

  // Group errors by type and field
  const errorGroups = {
    byType: errors.reduce(
      (acc, error, index) => {
        if (!acc[error.errorType]) acc[error.errorType] = [];
        acc[error.errorType].push({ ...error, index });
        return acc;
      },
      {} as Record<string, (ImportError & { index: number })[]>,
    ),

    byField: errors.reduce(
      (acc, error, index) => {
        const field = error.field || "unknown";
        if (!acc[field]) acc[field] = [];
        acc[field].push({ ...error, index });
        return acc;
      },
      {} as Record<string, (ImportError & { index: number })[]>,
    ),

    bySeverity: errors.reduce(
      (acc, error, index) => {
        if (!acc[error.severity]) acc[error.severity] = [];
        acc[error.severity].push({ ...error, index });
        return acc;
      },
      {} as Record<string, (ImportError & { index: number })[]>,
    ),
  };

  const toggleErrorSelection = useCallback((errorIndex: number) => {
    setSelectedErrors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(errorIndex)) {
        newSet.delete(errorIndex);
      } else {
        newSet.add(errorIndex);
      }
      return newSet;
    });
  }, []);

  const selectAllInGroup = useCallback((errorIndices: number[]) => {
    setSelectedErrors((prev) => {
      const newSet = new Set(prev);
      errorIndices.forEach((index) => newSet.add(index));
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedErrors(new Set());
  }, []);

  const applyBatchFix = useCallback(
    (fixType: "manual" | "auto" | "pattern", value?: unknown) => {
      const newFixes: ErrorFix[] = [];

      selectedErrors.forEach((errorIndex) => {
        const error = errors[errorIndex];
        if (error) {
          let newValue = value;
          let confidence: "high" | "medium" | "low" = "medium";

          // Auto-generate fixes based on error type
          if (fixType === "auto") {
            switch (error.errorType) {
              case "format":
                if (
                  error.field?.includes("date") ||
                  error.message.toLowerCase().includes("date")
                ) {
                  newValue = "2024-01"; // Default date format
                  confidence = "low";
                } else if (
                  error.field?.includes("number") ||
                  error.message.toLowerCase().includes("number")
                ) {
                  newValue = 0;
                  confidence = "low";
                }
                break;
              case "validation":
                if (error.message.toLowerCase().includes("missing")) {
                  newValue = error.field?.includes("id")
                    ? "AUTO_GENERATED"
                    : "DEFAULT_VALUE";
                  confidence = "low";
                }
                break;
              case "duplicate":
                newValue = `${error.value}_${Date.now()}`;
                confidence = "medium";
                break;
            }
          }

          newFixes.push({
            errorIndex,
            originalError: error,
            fixType,
            newValue,
            confidence,
            applied: false,
          });
        }
      });

      // Save current state for undo
      setUndoStack((prev) => [...prev, fixes]);
      setRedoStack([]); // Clear redo stack when new action is performed

      setFixes((prev) => [...prev, ...newFixes]);
      setSelectedErrors(new Set()); // Clear selection after applying fixes
    },
    [selectedErrors, errors, fixes],
  );

  const applyPatternFix = useCallback(() => {
    if (!batchFixValue.trim()) return;

    applyBatchFix("pattern", batchFixValue.trim());
    setBatchFixValue("");
  }, [batchFixValue, applyBatchFix]);

  const removeFix = useCallback(
    (fixIndex: number) => {
      setUndoStack((prev) => [...prev, fixes]);
      setRedoStack([]);
      setFixes((prev) => prev.filter((_, index) => index !== fixIndex));
    },
    [fixes],
  );

  const undo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack((prev) => [...prev, fixes]);
      setFixes(previousState);
      setUndoStack((prev) => prev.slice(0, -1));
    }
  }, [undoStack, fixes]);

  const redo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack((prev) => [...prev, fixes]);
      setFixes(nextState);
      setRedoStack((prev) => prev.slice(0, -1));
    }
  }, [redoStack, fixes]);

  const applyAllFixes = useCallback(() => {
    if (onApplyFixes) {
      onApplyFixes(fixes);
    }
  }, [fixes, onApplyFixes]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "validation":
        return "text-red-600";
      case "format":
        return "text-orange-600";
      case "duplicate":
        return "text-purple-600";
      case "database":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600" />
            Batch Error Resolution
          </CardTitle>
          <CardDescription>
            Resolve multiple errors at once with batch operations and pattern
            matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Selected:</span>
              <Badge variant="outline">{selectedErrors.size}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Fixes:</span>
              <Badge variant="outline">{fixes.length}</Badge>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={undoStack.length === 0}
                className="flex items-center gap-1"
              >
                <Undo2 className="h-3 w-3" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={redoStack.length === 0}
                className="flex items-center gap-1"
              >
                <Redo2 className="h-3 w-3" />
                Redo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="errors">Error Selection</TabsTrigger>
          <TabsTrigger value="fixes">Applied Fixes</TabsTrigger>
          <TabsTrigger value="batch">Batch Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          {/* Selection Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Errors to Fix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedErrors.size === 0}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAllInGroup(errors.map((_, i) => i))}
                >
                  Select All
                </Button>
              </div>

              {/* Error Groups */}
              <div className="space-y-4">
                {Object.entries(errorGroups.byType).map(
                  ([type, typeErrors]) => (
                    <div key={type} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-semibold ${getTypeColor(type)}`}>
                          {type.charAt(0).toUpperCase() + type.slice(1)} Errors
                          ({typeErrors.length})
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            selectAllInGroup(typeErrors.map((e) => e.index))
                          }
                        >
                          Select All {type}
                        </Button>
                      </div>

                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {typeErrors.map((error) => (
                            <div
                              key={error.index}
                              className={`flex items-start gap-3 p-2 rounded border ${
                                selectedErrors.has(error.index)
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-gray-50"
                              }`}
                            >
                              <Checkbox
                                checked={selectedErrors.has(error.index)}
                                onCheckedChange={() =>
                                  toggleErrorSelection(error.index)
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="outline"
                                    className={getSeverityColor(error.severity)}
                                  >
                                    {error.severity}
                                  </Badge>
                                  <span className="text-sm text-gray-600">
                                    Row {error.row}
                                  </span>
                                  {error.field && (
                                    <span className="text-sm text-gray-600">
                                      Field: {error.field}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm">{error.message}</p>
                                {error.suggestion && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    💡 {error.suggestion}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fixes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Applied Fixes ({fixes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fixes.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No fixes applied yet. Go to Error Selection tab to select
                    errors and apply fixes.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {fixes.map((fix, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                Row {fix.originalError.row}
                              </Badge>
                              <Badge variant="secondary">{fix.fixType}</Badge>
                              <Badge
                                variant={
                                  fix.confidence === "high"
                                    ? "default"
                                    : "outline"
                                }
                                className={
                                  fix.confidence === "high"
                                    ? "bg-green-100 text-green-800"
                                    : fix.confidence === "medium"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }
                              >
                                {fix.confidence} confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Original: {fix.originalError.message}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Fix:</span>{" "}
                              {fix.newValue}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFix(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Batch Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Fix */}
              <div className="space-y-2">
                <Label>Auto-Fix Selected Errors</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => applyBatchFix("auto")}
                    disabled={selectedErrors.size === 0}
                    className="flex items-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    Apply Auto-Fix
                  </Button>
                  <span className="text-sm text-gray-500 self-center">
                    ({selectedErrors.size} errors selected)
                  </span>
                </div>
              </div>

              {/* Pattern Fix */}
              <div className="space-y-2">
                <Label htmlFor="batch-value">
                  Apply Same Value to All Selected
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="batch-value"
                    value={batchFixValue}
                    onChange={(e) => setBatchFixValue(e.target.value)}
                    placeholder="Enter value to apply to all selected errors"
                  />
                  <Button
                    onClick={applyPatternFix}
                    disabled={
                      selectedErrors.size === 0 || !batchFixValue.trim()
                    }
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={applyAllFixes}
                  disabled={fixes.length === 0}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Apply All Fixes ({fixes.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={onExportErrors}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Errors
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
