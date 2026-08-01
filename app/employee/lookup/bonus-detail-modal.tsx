"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift, PenTool, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
import { formatBonusDetailValue } from "@/lib/bonus/bonus-detail-format";
import type { EmployeeBonusItem } from "@/lib/bonus/bonus-types";
import type { BonusDetailItem } from "@/lib/validations/bonus";

interface BonusDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bonus: EmployeeBonusItem;
  employeeId: string;
  signingLoading: boolean;
  signError: string;
  onSign: () => void;
}

function DetailRow({ item }: { item: BonusDetailItem }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">
        {item.label}:
      </span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-foreground">
        {formatBonusDetailValue(item)}
      </span>
    </div>
  );
}

export function BonusDetailModal({
  isOpen,
  onClose,
  bonus,
  employeeId,
  signingLoading,
  signError,
  onSign,
}: BonusDetailModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-6">
            <Gift className="mt-0.5 w-5 h-5 shrink-0 text-pink-600" />
            <span className="min-w-0 break-words">
              {bonus.bonus_title || bonus.bonus_type_label}
            </span>
          </DialogTitle>
          <DialogDescription>
            {bonus.bonus_type_label} • {bonus.bonus_period}
          </DialogDescription>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mã NV:</span>
            <Badge>{employeeId}</Badge>
          </div>
        </DialogHeader>

        {bonus.detail_data.length > 0 && (
          <div className="space-y-1">
            {bonus.detail_data.map((item, index) => (
              <DetailRow key={`${item.label}-${index}`} item={item} />
            ))}
          </div>
        )}

        <Card className="border-primary bg-primary text-primary-foreground">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-primary-foreground/80">
              Số Tiền Thưởng
            </p>
            <p className="text-2xl font-bold">{formatCurrency(bonus.amount)}</p>
          </CardContent>
        </Card>

        {signError && !bonus.is_signed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{signError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {bonus.is_signed ? (
            <div className="flex w-full items-center gap-3 rounded-lg border border-primary/50 bg-background p-4 text-primary">
              <CheckCircle className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-medium">Đã ký nhận</p>
                {bonus.signed_at_display && (
                  <p className="text-sm text-primary/80">
                    Thời gian: {bonus.signed_at_display}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Button
              onClick={onSign}
              disabled={signingLoading}
              className="w-full"
            >
              {signingLoading ? (
                <>
                  <Loader2
                    data-icon="inline-start"
                    className="h-4 w-4 animate-spin"
                  />
                  Đang ký nhận...
                </>
              ) : (
                <>
                  <PenTool data-icon="inline-start" className="h-4 w-4" />
                  Ký Nhận
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
