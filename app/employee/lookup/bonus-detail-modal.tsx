"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift, PenTool, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
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

function renderDetailValue(value: BonusDetailItem["value"]): string {
  return typeof value === "number" ? formatCurrency(value) : value;
}

function DetailRow({ item }: { item: BonusDetailItem }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <span className="text-sm font-medium text-muted-foreground">
        {item.label}:
      </span>
      <span className="text-sm font-semibold text-foreground">
        {renderDetailValue(item.value)}
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-600" />
            {bonus.bonus_title || bonus.bonus_type_label}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={signingLoading} className="w-full">
                  {signingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang ký nhận...
                    </>
                  ) : (
                    <>
                      <PenTool className="mr-2 h-4 w-4" />
                      Ký Nhận
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận ký nhận</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn xác nhận đã nhận {bonus.bonus_type_label} kỳ{" "}
                    {bonus.bonus_period} với số tiền{" "}
                    {formatCurrency(bonus.amount)}? Thao tác này chỉ thực hiện
                    được một lần.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={onSign}>
                    Ký Nhận
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
