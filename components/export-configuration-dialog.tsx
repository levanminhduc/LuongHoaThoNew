"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  FileSpreadsheet,
  Settings,
  Eye,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  Database,
} from "lucide-react";
import { useMappingConfig } from "@/lib/hooks/use-mapping-config";
import { useHeaderMapping as useHeaderMappingUtils } from "@/lib/hooks/use-header-mapping";
import type { MappingConfiguration } from "@/lib/column-alias-config";

interface ExportConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
  availableFields?: string[];
  defaultSalaryMonth?: string;
}

export interface ExportOptions {
  includeData: boolean;
  salaryMonth?: string;
  configId?: number;
  customFilename?: string;
  selectedFields?: string[];
  previewHeaders?: Record<string, string>;
}

export function ExportConfigurationDialog({
  open,
  onOpenChange,
  onExport,
  availableFields = [],
  defaultSalaryMonth,
}: ExportConfigurationDialogProps) {
  // State
  const [includeData, setIncludeData] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(defaultSalaryMonth || "");
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [customFilename, setCustomFilename] = useState("");
  const [selectedFields, setSelectedFields] =
    useState<string[]>(availableFields);
  const [showPreview, setShowPreview] = useState(false);

  // Hooks
  const { configurations, defaultConfig, isLoading } = useMappingConfig();
  const { mapHeaders, generatePreview } = useHeaderMappingUtils();

  // Auto-select default config
  useEffect(() => {
    if (defaultConfig && !selectedConfigId) {
      setSelectedConfigId(defaultConfig.id!);
    }
  }, [defaultConfig, selectedConfigId]);

  // Update selected fields when available fields change
  useEffect(() => {
    if (availableFields.length > 0 && selectedFields.length === 0) {
      setSelectedFields(availableFields);
    }
  }, [availableFields, selectedFields.length]);

  // Generate header preview
  const headerPreview = generatePreview(
    selectedFields,
    selectedConfigId || undefined,
  );

  // Handle export
  const handleExport = () => {
    const previewHeaders = headerPreview.preview.reduce(
      (acc, item) => {
        acc[item.field] = item.header;
        return acc;
      },
      {} as Record<string, string>,
    );

    const exportOptions: ExportOptions = {
      includeData,
      salaryMonth: includeData ? salaryMonth : undefined,
      configId: selectedConfigId || undefined,
      customFilename: customFilename.trim() || undefined,
      selectedFields,
      previewHeaders,
    };

    onExport(exportOptions);
    onOpenChange(false);
  };

  // Handle generate template from configuration
  const handleGenerateTemplate = async () => {
    if (!selectedConfigId) return;

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const response = await fetch(
        `/api/admin/generate-import-template?configId=${selectedConfigId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const configName = response.headers.get("X-Config-Name") || "template";
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `import-template-${configName.replace(/\s+/g, "-")}-${timestamp}.xlsx`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onOpenChange(false);
    } catch (error) {
      console.error("Generate template error:", error);
    }
  };

  // Handle field selection toggle
  const handleFieldToggle = (field: string, checked: boolean) => {
    if (checked) {
      setSelectedFields((prev) => [...prev, field]);
    } else {
      setSelectedFields((prev) => prev.filter((f) => f !== field));
    }
  };

  // Handle select all/none
  const handleSelectAll = () => {
    setSelectedFields(availableFields);
  };

  const handleSelectNone = () => {
    setSelectedFields([]);
  };

  // Get selected configuration
  const selectedConfig = selectedConfigId
    ? configurations.find((c) => c.id === selectedConfigId)
    : null;

  // Generate filename preview
  const generateFilenamePreview = () => {
    if (customFilename.trim()) {
      return customFilename.trim();
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const configSuffix = selectedConfig
      ? `-${selectedConfig.config_name.replace(/\s+/g, "-")}`
      : "";

    if (includeData && salaryMonth) {
      return `luong-export-${salaryMonth}${configSuffix}-${timestamp}.xlsx`;
    } else {
      return `template-luong${configSuffix}-${timestamp}.xlsx`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Configuration
          </DialogTitle>
          <DialogDescription>
            Configure export options and preview headers before generating Excel
            file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
            {/* Left Panel - Configuration */}
            <div className="space-y-3 overflow-y-auto pr-2">
              <Card className="flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Export Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Export Type */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={includeData}
                      onCheckedChange={setIncludeData}
                    />
                    <Label className="text-sm">
                      Include actual data (not just template)
                    </Label>
                  </div>

                  {/* Salary Month */}
                  {includeData && (
                    <div className="space-y-2">
                      <Label htmlFor="salary-month" className="text-sm">
                        Salary Month
                      </Label>
                      <Input
                        id="salary-month"
                        type="month"
                        value={salaryMonth}
                        onChange={(e) => setSalaryMonth(e.target.value)}
                        placeholder="Select month..."
                        className="h-9"
                      />
                    </div>
                  )}

                  {/* Mapping Configuration */}
                  <div className="space-y-2">
                    <Label className="text-sm">Mapping Configuration</Label>
                    <Select
                      value={selectedConfigId?.toString() || ""}
                      onValueChange={(value) =>
                        setSelectedConfigId(
                          value && value !== "none" ? parseInt(value) : null,
                        )
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select configuration..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No configuration (use defaults)
                        </SelectItem>
                        {configurations.map((config) => (
                          <SelectItem
                            key={config.id}
                            value={config.id!.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate">
                                {config.config_name}
                              </span>
                              {config.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedConfig && (
                      <div className="text-xs text-gray-600 space-y-1">
                        {selectedConfig.description && (
                          <p className="truncate">
                            {selectedConfig.description}
                          </p>
                        )}
                        <p>
                          {selectedConfig.field_mappings?.length || 0} field
                          mappings
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Custom Filename */}
                  <div className="space-y-2">
                    <Label htmlFor="custom-filename" className="text-sm">
                      Custom Filename (Optional)
                    </Label>
                    <Input
                      id="custom-filename"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder="Leave empty for auto-generated name"
                      className="h-9"
                    />
                    <div className="text-xs text-gray-500 truncate">
                      Preview: {generateFilenamePreview()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Field Selection */}
              <Card className="flex-1 min-h-0 flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Field Selection
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="h-7 px-2 text-xs"
                      >
                        All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectNone}
                        className="h-7 px-2 text-xs"
                      >
                        None
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Choose fields to include ({selectedFields.length} of{" "}
                    {availableFields.length} selected)
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {availableFields.map((field) => {
                        const isSelected = selectedFields.includes(field);
                        const fieldPreview = headerPreview.preview.find(
                          (p) => p.field === field,
                        );

                        return (
                          <div
                            key={field}
                            className="flex items-start space-x-2 py-1"
                          >
                            <Switch
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleFieldToggle(field, checked)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {field}
                              </div>
                              {fieldPreview && (
                                <div className="text-xs text-gray-500 truncate">
                                  → {fieldPreview.header}
                                  <Badge
                                    variant="outline"
                                    className="ml-1 text-xs h-4"
                                  >
                                    {fieldPreview.source}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Preview */}
            <div className="space-y-3 overflow-y-auto pr-2">
              <Card className="flex-1 min-h-0 flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Header Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Preview of Excel headers that will be generated
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 space-y-3">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-lg font-bold text-blue-600">
                        {headerPreview.summary.total}
                      </div>
                      <div className="text-xs text-blue-600">Total Fields</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">
                        {Math.round(headerPreview.summary.averageConfidence)}%
                      </div>
                      <div className="text-xs text-green-600">
                        Avg Confidence
                      </div>
                    </div>
                  </div>

                  {/* Source Breakdown */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>From Configuration:</span>
                      <Badge variant="default" className="text-xs h-5">
                        {headerPreview.summary.fromConfig}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>From Defaults:</span>
                      <Badge variant="secondary" className="text-xs h-5">
                        {headerPreview.summary.fromDefault}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Fallback:</span>
                      <Badge variant="outline" className="text-xs h-5">
                        {headerPreview.summary.fallback}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Header List */}
                  <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="space-y-2 pr-2">
                        {headerPreview.preview
                          .filter((item) => selectedFields.includes(item.field))
                          .map((item) => (
                            <div
                              key={item.field}
                              className="p-2 border rounded text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium truncate flex-1">
                                  {item.header}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Badge
                                    variant={
                                      item.source === "configuration"
                                        ? "default"
                                        : item.source === "default"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs h-4"
                                  >
                                    {item.source}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs h-4 ${
                                      item.confidence >= 80
                                        ? "text-green-600"
                                        : item.confidence >= 50
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {item.confidence}%
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                Field: {item.field}
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings */}
              {headerPreview.summary.fallback > 0 && (
                <Alert className="flex-shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {headerPreview.summary.fallback} fields are using fallback
                    headers. Consider creating a mapping configuration for
                    better header names.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9"
            >
              Cancel
            </Button>

            <div className="flex gap-2">
              {selectedConfigId && (
                <Button
                  variant="outline"
                  onClick={handleGenerateTemplate}
                  className="flex items-center gap-2 h-9"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Generate Template
                </Button>
              )}
              <Button
                onClick={handleExport}
                disabled={selectedFields.length === 0}
                className="flex items-center gap-2 h-9"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
