"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PenTool } from "lucide-react";
import { SIGNATURE_TYPES } from "@/lib/validations";
import type { SignatureType } from "@/lib/validations/common";
import type {
  BonusEmployeeSignProgress,
  BonusSignatureRecord,
} from "@/lib/bonus/bonus-types";

export const SIGNATURE_TYPE_LABELS: Record<SignatureType, string> = {
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
};

export function BonusSignatureStatusPanel({
  progress,
  signatures,
}: {
  progress: BonusEmployeeSignProgress;
  signatures: Record<SignatureType, BonusSignatureRecord | null>;
}) {
  return (
    <>
      <div className="rounded-lg border bg-gray-50 p-4">
        <p className="font-medium text-gray-800">Tiến độ nhân viên ký nhận</p>
        <p className="mt-1 text-sm text-gray-600">
          {progress.signed}/{progress.total} nhân viên đã ký (
          {progress.percentage.toFixed(1)}%)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SIGNATURE_TYPES.map((type) => {
          const record = signatures[type];
          return (
            <div
              key={type}
              className="rounded-lg border border-green-200 bg-green-50 p-3 text-center"
            >
              <div className="text-2xl font-bold text-green-600">
                {record ? "✅" : "⏳"}
              </div>
              <p className="mt-2 text-sm text-green-800">
                {SIGNATURE_TYPE_LABELS[type]}
              </p>
              {record && (
                <p className="mt-1 text-xs text-green-600">
                  {record.signed_by_name}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function BonusSignatureAction({
  signatureType,
  bonusPeriod,
  notes,
  onNotesChange,
  onConfirm,
  disabled,
}: {
  signatureType: SignatureType;
  bonusPeriod: string;
  notes: string;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bonus-signature-notes">Ghi chú (tùy chọn)</Label>
        <Textarea
          id="bonus-signature-notes"
          placeholder="Nhập ghi chú cho việc ký duyệt đợt thưởng..."
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={3}
          maxLength={500}
          className="resize-none"
        />
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full bg-green-600 text-white hover:bg-green-700"
            disabled={disabled}
            size="lg"
          >
            <PenTool className="mr-2 h-4 w-4" />
            Ký Xác Nhận {SIGNATURE_TYPE_LABELS[signatureType]}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận ký duyệt</AlertDialogTitle>
            <AlertDialogDescription>
              Tôi xác nhận đã kiểm tra đợt thưởng {bonusPeriod} và đồng ý ký
              duyệt với vai trò {SIGNATURE_TYPE_LABELS[signatureType]}. Chữ ký
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              Ký Xác Nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
