"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  ArrowRight,
} from "lucide-react";
import {
  PAYROLL_FIELD_DEFINITIONS,
  PAYROLL_FIELD_CATEGORIES,
  getFieldsByCategory,
  getRequiredFields,
  type PayrollFieldDefinition,
} from "@/lib/payroll-field-definitions";

interface ColumnMapping {
  id?: number;
  config_id: number;
  excel_column_name: string;
  database_field: string;
  data_type: "text" | "number" | "date";
  is_required: boolean;
  default_value?: string;
  display_order: number;
}

interface ColumnMappingManagerProps {
  configId: number;
  fileType: "file1" | "file2";
  detectedColumns: string[];
  existingMappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onSave: (mappings: ColumnMapping[]) => Promise<boolean>;
}

export function ColumnMappingManager({
  configId,
  fileType,
  detectedColumns,
  existingMappings,
  onMappingsChange,
  onSave,
}: ColumnMappingManagerProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const initializeMappings = useCallback(() => {
    const initialMappings: ColumnMapping[] = detectedColumns.map(
      (columnName, index) => {
        // Check if mapping already exists
        const existingMapping = existingMappings.find(
          (m) => m.excel_column_name === columnName,
        );

        if (existingMapping) {
          return existingMapping;
        }

        // Auto-suggest mapping based on column name
        const suggestedField = autoSuggestDatabaseField(columnName);
        const fieldDef = PAYROLL_FIELD_DEFINITIONS.find(
          (f) => f.field === suggestedField,
        );

        return {
          config_id: configId,
          excel_column_name: columnName,
          database_field: suggestedField,
          data_type: fieldDef?.data_type || "text",
          is_required: fieldDef?.is_required || false,
          default_value: fieldDef?.default_value?.toString() || "",
          display_order: index,
        };
      },
    );

    setMappings(initialMappings);
    onMappingsChange(initialMappings);
  }, [detectedColumns, existingMappings, configId, onMappingsChange]);

  useEffect(() => {
    initializeMappings();
  }, [initializeMappings]);

  const autoSuggestDatabaseField = (excelColumnName: string): string => {
    const normalizedColumn = excelColumnName.toLowerCase().trim();

    // Simple mapping suggestions based on common patterns
    const suggestions: { [key: string]: string } = {
      "mã nhân viên": "employee_id",
      "ma nhan vien": "employee_id",
      employee_id: "employee_id",
      "tháng lương": "salary_month",
      "thang luong": "salary_month",
      salary_month: "salary_month",
      "hệ số làm việc": "he_so_lam_viec",
      "he so lam viec": "he_so_lam_viec",
      "hệ số lương cơ bản": "he_so_luong_co_ban",
      "he so luong co ban": "he_so_luong_co_ban",
      "ngày công trong giờ": "ngay_cong_trong_gio",
      "ngay cong trong gio": "ngay_cong_trong_gio",
      "giờ tăng ca": "gio_cong_tang_ca",
      "gio tang ca": "gio_cong_tang_ca",
      "tổng lương": "tong_cong_tien_luong",
      "tong luong": "tong_cong_tien_luong",
      "lương thực nhận": "tien_luong_thuc_nhan_cuoi_ky",
      "luong thuc nhan": "tien_luong_thuc_nhan_cuoi_ky",
      "thuế tncn": "thue_tncn",
      "thue tncn": "thue_tncn",
      "tạm ứng": "tam_ung",
      "tam ung": "tam_ung",
      bhxh: "bhxh_bhtn_bhyt_total",
    };

    return suggestions[normalizedColumn] || "";
  };

  const updateMapping = (
    index: number,
    field: keyof ColumnMapping,
    value: any,
  ) => {
    const updatedMappings = [...mappings];

    // Handle special "__no_mapping__" value
    if (field === "database_field" && value === "__no_mapping__") {
      updatedMappings[index] = { ...updatedMappings[index], [field]: "" };
    } else {
      updatedMappings[index] = { ...updatedMappings[index], [field]: value };
    }

    // Update data_type and is_required based on selected database field
    if (field === "database_field") {
      const actualValue = value === "__no_mapping__" ? "" : value;
      const fieldDef = PAYROLL_FIELD_DEFINITIONS.find(
        (f) => f.field === actualValue,
      );
      if (fieldDef) {
        updatedMappings[index].data_type = fieldDef.data_type;
        updatedMappings[index].is_required = fieldDef.is_required;
        updatedMappings[index].default_value =
          fieldDef.default_value?.toString() || "";
      } else if (actualValue === "") {
        // Reset to defaults when no mapping
        updatedMappings[index].data_type = "text";
        updatedMappings[index].is_required = false;
        updatedMappings[index].default_value = "";
      }
    }

    setMappings(updatedMappings);
    onMappingsChange(updatedMappings);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      // Validate mappings
      const validationErrors = validateMappings();
      if (validationErrors.length > 0) {
        setMessage(`Validation errors: ${validationErrors.join(", ")}`);
        setSaving(false);
        return;
      }

      const success = await onSave(mappings);
      if (success) {
        setMessage("Column mappings saved successfully!");
      } else {
        setMessage("Failed to save column mappings");
      }
    } catch (error) {
      setMessage(
        `Error saving mappings: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const requiredFields = getRequiredFields();
    const mappedFields = mappings.map((m) => m.database_field).filter((f) => f);

    // Check if all required fields are mapped
    requiredFields.forEach((field) => {
      if (!mappedFields.includes(field.field)) {
        errors.push(`Required field "${field.label}" is not mapped`);
      }
    });

    // Check for duplicate mappings
    const duplicates = mappedFields.filter(
      (field, index) => field && mappedFields.indexOf(field) !== index,
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate mappings found: ${duplicates.join(", ")}`);
    }

    return errors;
  };

  const resetMappings = () => {
    initializeMappings();
    setMessage("Mappings reset to auto-suggestions");
  };

  const getFilteredFields = () => {
    if (selectedCategory === "all") {
      return PAYROLL_FIELD_DEFINITIONS;
    }
    return getFieldsByCategory(selectedCategory);
  };

  const getMappingStatus = (mapping: ColumnMapping) => {
    if (!mapping.database_field) return "unmapped";
    const fieldDef = PAYROLL_FIELD_DEFINITIONS.find(
      (f) => f.field === mapping.database_field,
    );
    if (fieldDef?.is_required) return "required";
    return "mapped";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Column Mapping Configuration - {fileType.toUpperCase()}
        </CardTitle>
        <CardDescription>
          Map Excel columns to database fields for{" "}
          {fileType === "file1" ? "File 1" : "File 2"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label>Filter by category:</Label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PAYROLL_FIELD_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetMappings}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Mappings"}
            </Button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <Alert
            className={
              message.includes("error") || message.includes("Validation")
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
          >
            <AlertDescription
              className={
                message.includes("error") || message.includes("Validation")
                  ? "text-red-800"
                  : "text-green-800"
              }
            >
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Mapping List */}
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {mappings.map((mapping, index) => {
              const status = getMappingStatus(mapping);
              const fieldDef = PAYROLL_FIELD_DEFINITIONS.find(
                (f) => f.field === mapping.database_field,
              );

              return (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Excel Column */}
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">
                            {mapping.excel_column_name}
                          </p>
                          <p className="text-xs text-gray-500">Excel Column</p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="md:col-span-1 flex justify-center">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Database Field Selection */}
                    <div className="md:col-span-4">
                      <Select
                        value={mapping.database_field || "__no_mapping__"}
                        onValueChange={(value) =>
                          updateMapping(index, "database_field", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select database field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__no_mapping__">
                            -- No mapping --
                          </SelectItem>
                          {getFilteredFields().map((field) => (
                            <SelectItem key={field.field} value={field.field}>
                              <div className="flex items-center gap-2">
                                <Database className="w-3 h-3" />
                                <span>{field.label}</span>
                                {field.is_required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Field Info */}
                    <div className="md:col-span-3">
                      {fieldDef && (
                        <div className="text-xs text-gray-600">
                          <p>
                            <strong>Type:</strong> {fieldDef.data_type}
                          </p>
                          <p>
                            <strong>Category:</strong> {fieldDef.category}
                          </p>
                          {fieldDef.description && (
                            <p className="mt-1">{fieldDef.description}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="md:col-span-1 flex justify-center">
                      {status === "required" && (
                        <Badge variant="destructive" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Required
                        </Badge>
                      )}
                      {status === "mapped" && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mapped
                        </Badge>
                      )}
                      {status === "unmapped" && (
                        <Badge variant="outline" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Unmapped
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary */}
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">
              {detectedColumns.length}
            </p>
            <p className="text-sm text-blue-600">Excel Columns</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">
              {mappings.filter((m) => m.database_field).length}
            </p>
            <p className="text-sm text-green-600">Mapped</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-700">
              {
                mappings.filter((m) => getMappingStatus(m) === "required")
                  .length
              }
            </p>
            <p className="text-sm text-red-600">Required</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-700">
              {mappings.filter((m) => !m.database_field).length}
            </p>
            <p className="text-sm text-orange-600">Unmapped</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
