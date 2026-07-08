"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Clock, PenTool } from "lucide-react";
import { formatTimestampFromDBRaw } from "@/lib/utils/vietnam-timezone";
import { useBonusPeriodsQuery } from "@/lib/hooks/use-bonus-list";
import {
  useBonusSignatureStatusQuery,
  useBonusManagementSignatureMutation,
} from "@/lib/hooks/use-bonus-signature";
import {
  SIGNATURE_TYPE_LABELS,
  BonusSignatureStatusPanel,
  BonusSignatureAction,
} from "@/components/signature/bonus-signature-panels";
import type { SignatureType } from "@/lib/validations/common";
import type { BonusType } from "@/lib/validations/bonus";

const PERIOD_VALUE_SEPARATOR = "__";

function toPeriodKey(bonusType: string, bonusPeriod: string): string {
  return `${bonusType}${PERIOD_VALUE_SEPARATOR}${bonusPeriod}`;
}

interface BonusManagementSignatureFormProps {
  signatureType: SignatureType;
}

export default function BonusManagementSignatureForm({
  signatureType,
}: BonusManagementSignatureFormProps) {
  const [selectedKey, setSelectedKey] = useState("");
  const [notes, setNotes] = useState("");

  const periodsQuery = useBonusPeriodsQuery();
  const periods = periodsQuery.data?.periods ?? [];

  const selectedPeriod = useMemo(() => {
    if (!selectedKey) return null;
    const [bonusType, bonusPeriod] = selectedKey.split(PERIOD_VALUE_SEPARATOR);
    return { bonusType: bonusType as BonusType, bonusPeriod };
  }, [selectedKey]);

  const statusQuery = useBonusSignatureStatusQuery({
    bonusType: selectedPeriod?.bonusType ?? null,
    bonusPeriod: selectedPeriod?.bonusPeriod ?? null,
  });
  const status = statusQuery.data ?? null;
  const signMutation = useBonusManagementSignatureMutation();

  const progress = status?.employee_sign_progress ?? null;
  const ownSignature = status?.signatures[signatureType] ?? null;
  const isAllEmployeesSigned = progress
    ? progress.total > 0 && progress.signed === progress.total
    : false;
  const canSign =
    Boolean(selectedPeriod) && isAllEmployeesSigned && !ownSignature;

  const handleConfirmSign = () => {
    if (!selectedPeriod || !canSign) return;
    signMutation.mutate(
      {
        bonus_type: selectedPeriod.bonusType,
        bonus_period: selectedPeriod.bonusPeriod,
        signature_type: signatureType,
        notes: notes.trim() || undefined,
        device_info: navigator.userAgent,
      },
      { onSuccess: () => setNotes("") },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Ký Duyệt Tiền Thưởng ({SIGNATURE_TYPE_LABELS[signatureType]})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Chọn đợt thưởng</Label>
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn đợt thưởng để ký duyệt" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem
                  key={toPeriodKey(period.bonus_type, period.bonus_period)}
                  value={toPeriodKey(period.bonus_type, period.bonus_period)}
                >
                  {period.bonus_type_label} • {period.bonus_period}
                  {period.bonus_title ? ` • ${period.bonus_title}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {status && progress && (
          <>
            <BonusSignatureStatusPanel
              progress={progress}
              signatures={status.signatures}
            />

            {ownSignature ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <p className="font-medium">Đã ký duyệt thành công</p>
                  <p className="text-sm">
                    Ký bởi: {ownSignature.signed_by_name} •{" "}
                    {formatTimestampFromDBRaw(ownSignature.signed_at)}
                  </p>
                </AlertDescription>
              </Alert>
            ) : !isAllEmployeesSigned ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Cần đủ 100% nhân viên trong đợt thưởng ký nhận trước khi ký
                  duyệt.
                </AlertDescription>
              </Alert>
            ) : (
              <BonusSignatureAction
                signatureType={signatureType}
                bonusPeriod={selectedPeriod?.bonusPeriod ?? ""}
                notes={notes}
                onNotesChange={setNotes}
                onConfirm={handleConfirmSign}
                disabled={!canSign || signMutation.isPending}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
