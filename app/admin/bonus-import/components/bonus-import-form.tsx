"use client";

import { FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BONUS_TYPES, BONUS_TYPE_LABELS } from "@/lib/validations/bonus";
import type { BonusType } from "@/lib/validations/bonus";

interface BonusImportFormProps {
  bonusType: BonusType | "";
  onBonusTypeChange: (value: BonusType) => void;
  bonusPeriod: string;
  onBonusPeriodChange: (value: string) => void;
  bonusPeriodError: string | null;
  bonusTitle: string;
  onBonusTitleChange: (value: string) => void;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export function BonusImportForm({
  bonusType,
  onBonusTypeChange,
  bonusPeriod,
  onBonusPeriodChange,
  bonusPeriodError,
  bonusTitle,
  onBonusTitleChange,
  selectedFile,
  onFileSelect,
  disabled,
}: BonusImportFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bonus-type">Loại Thưởng</Label>
          <Select
            value={bonusType}
            onValueChange={(value) => onBonusTypeChange(value as BonusType)}
            disabled={disabled}
          >
            <SelectTrigger id="bonus-type">
              <SelectValue placeholder="Chọn loại thưởng" />
            </SelectTrigger>
            <SelectContent>
              {BONUS_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {BONUS_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonus-period">Kỳ Thưởng</Label>
          <Input
            id="bonus-period"
            value={bonusPeriod}
            onChange={(event) => onBonusPeriodChange(event.target.value)}
            placeholder="2026-Q2"
            disabled={disabled}
          />
          {bonusPeriodError && (
            <p className="text-xs text-red-600">{bonusPeriodError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonus-title">Tiêu Đề Đợt Thưởng</Label>
          <Input
            id="bonus-title"
            value={bonusTitle}
            onChange={(event) => onBonusTitleChange(event.target.value)}
            placeholder="Thưởng 10% TB 6 tháng đầu năm 2026"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bonus-file">Chọn File Excel</Label>
        <Input
          id="bonus-file"
          type="file"
          accept=".xlsx,.xls"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelect(file);
          }}
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
    </div>
  );
}
