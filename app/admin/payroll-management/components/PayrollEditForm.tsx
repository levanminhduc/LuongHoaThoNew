"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
import type { PayrollData, PayrollUpdateRequest } from "../types";
import { PAYROLL_FIELD_GROUPS } from "../types";

interface PayrollEditFormProps {
  payrollData: PayrollData | null;
  onSave: (updateRequest: PayrollUpdateRequest) => Promise<void>;
  loading?: boolean;
}

export function PayrollEditForm({
  payrollData,
  onSave,
  loading = false,
}: PayrollEditFormProps) {
  const [formData, setFormData] = useState<Partial<PayrollData>>({});
  const [changeReason, setChangeReason] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Initialize form data when payrollData changes
  useEffect(() => {
    if (payrollData) {
      setFormData({ ...payrollData });
      // Open first section by default
      setOpenSections({ [PAYROLL_FIELD_GROUPS[0].title]: true });
    }
  }, [payrollData]);

  // Check for changes
  useEffect(() => {
    if (!payrollData) return;

    const hasAnyChanges = PAYROLL_FIELD_GROUPS.some((group) =>
      group.fields.some((field) => {
        const currentValue = formData[field.key];
        const originalValue = payrollData[field.key];
        return currentValue !== originalValue;
      }),
    );

    setHasChanges(hasAnyChanges);
  }, [formData, payrollData]);

  const handleFieldChange = (fieldKey: keyof PayrollData, value: string) => {
    // Handle empty string as null/undefined for optional fields, 0 for required fields
    let processedValue: number | undefined;

    if (value === "" || value === null || value === undefined) {
      processedValue = undefined;
    } else {
      const numericValue = parseFloat(value);
      processedValue = isNaN(numericValue) ? 0 : numericValue;
    }

    setFormData((prev) => ({
      ...prev,
      [fieldKey]: processedValue,
    }));

    // Clear validation error for this field
    if (validationErrors[fieldKey]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    PAYROLL_FIELD_GROUPS.forEach((group) => {
      group.fields.forEach((field) => {
        const value = formData[field.key];

        // Type-safe validation with proper null/undefined handling
        if (
          field.required &&
          (value === undefined ||
            value === null ||
            (typeof value === "number" && value === 0))
        ) {
          errors[field.key] = `${field.label} là bắt buộc`;
        }

        if (
          field.min !== undefined &&
          value !== undefined &&
          value !== null &&
          typeof value === "number" &&
          value < field.min
        ) {
          errors[field.key] = `${field.label} phải >= ${field.min}`;
        }

        if (
          field.max !== undefined &&
          value !== undefined &&
          value !== null &&
          typeof value === "number" &&
          value > field.max
        ) {
          errors[field.key] = `${field.label} phải <= ${field.max}`;
        }

        if (field.validation && value !== undefined && value !== null) {
          const validationError = field.validation(value);
          if (validationError) {
            errors[field.key] = validationError;
          }
        }
      });
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!payrollData || !hasChanges) return;

    if (!changeReason.trim()) {
      alert("Vui lòng nhập lý do thay đổi");
      return;
    }

    if (!validateForm()) {
      alert("Vui lòng sửa các lỗi validation trước khi lưu");
      return;
    }

    // Prepare updates (only changed fields)
    const updates: Record<string, unknown> = {};
    PAYROLL_FIELD_GROUPS.forEach((group) => {
      group.fields.forEach((field) => {
        const currentValue = formData[field.key];
        const originalValue = payrollData[field.key];
        if (currentValue !== originalValue) {
          updates[field.key] = currentValue;
        }
      });
    });

    const updateRequest: PayrollUpdateRequest = {
      updates,
      changeReason: changeReason.trim(),
    };

    await onSave(updateRequest);
    setChangeReason("");
  };

  const toggleSection = (sectionTitle: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const calculateTotalIncome = () => {
    const incomeFields = [
      "tong_cong_tien_luong_san_pham",
      "tien_khen_thuong_chuyen_can",
      "ho_tro_thoi_tiet_nong",
      "bo_sung_luong",
      "tien_boc_vac",
      "ho_tro_xang_xe",
      "tien_phep_le",
    ];

    return incomeFields.reduce((total, field) => {
      const value = (formData[field as keyof PayrollData] as number) || 0;
      return total + value;
    }, 0);
  };

  const calculateTotalDeductions = () => {
    const deductionFields = [
      "thue_tncn",
      "bhxh_bhtn_bhyt_total",
      "tam_ung",
      "truy_thu_the_bhyt",
    ];

    return deductionFields.reduce((total, field) => {
      const value = (formData[field as keyof PayrollData] as number) || 0;
      return total + value;
    }, 0);
  };

  if (!payrollData) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Vui lòng chọn nhân viên để chỉnh sửa thông tin lương</p>
        </CardContent>
      </Card>
    );
  }

  const totalIncome = calculateTotalIncome();
  const totalDeductions = calculateTotalDeductions();
  const netSalary = formData.tien_luong_thuc_nhan_cuoi_ky || 0;

  return (
    <div className="space-y-6">
      {/* Employee Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Chỉnh Sửa Lương: {payrollData.employees?.full_name}</span>
            <Badge variant="outline">{payrollData.employee_id}</Badge>
          </CardTitle>
          <CardDescription>
            {payrollData.employees?.department} -{" "}
            {payrollData.employees?.chuc_vu} | Tháng: {payrollData.salary_month}{" "}
            | Nguồn: {payrollData.source_file}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Calculations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tổng Quan Tính Toán</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </div>
              <div className="text-sm text-green-700">Tổng Thu Nhập</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDeductions)}
              </div>
              <div className="text-sm text-red-700">Tổng Khấu Trừ</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(netSalary)}
              </div>
              <div className="text-sm text-blue-700">Lương Thực Nhận</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Fields by Groups */}
      <div className="space-y-4">
        {PAYROLL_FIELD_GROUPS.map((group) => (
          <Card key={group.title}>
            <Collapsible
              open={openSections[group.title]}
              onOpenChange={() => toggleSection(group.title)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{group.title}</CardTitle>
                      <CardDescription>{group.description}</CardDescription>
                    </div>
                    {openSections[group.title] ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label
                          htmlFor={field.key}
                          className="flex items-center gap-2"
                        >
                          {field.label}
                          {field.required && (
                            <span className="text-red-500">*</span>
                          )}
                        </Label>
                        <Input
                          id={field.key}
                          type="number"
                          value={
                            formData[field.key] !== undefined &&
                            formData[field.key] !== null
                              ? String(formData[field.key])
                              : ""
                          }
                          onChange={(e) =>
                            handleFieldChange(field.key, e.target.value)
                          }
                          min={field.min}
                          max={field.max}
                          step={field.step || 1}
                          disabled={loading}
                          className={
                            validationErrors[field.key] ? "border-red-500" : ""
                          }
                        />
                        {validationErrors[field.key] && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {validationErrors[field.key]}
                          </p>
                        )}
                        {field.description && (
                          <p className="text-xs text-gray-500">
                            {field.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Change Reason and Save */}
      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Xác Nhận Thay Đổi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="changeReason">Lý do thay đổi *</Label>
              <Textarea
                id="changeReason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Nhập lý do thay đổi dữ liệu lương (bắt buộc)..."
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={
                  loading ||
                  !changeReason.trim() ||
                  Object.keys(validationErrors).length > 0
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu Thay Đổi
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setFormData({ ...payrollData });
                  setChangeReason("");
                }}
                disabled={loading}
              >
                Hủy Thay Đổi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
