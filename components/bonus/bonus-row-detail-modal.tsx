"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, CheckCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
import { formatTimestampFromDBRaw } from "@/lib/utils/vietnam-timezone";
import { formatBonusDetailValue } from "@/lib/bonus/bonus-detail-format";
import type { BonusListRow } from "@/lib/bonus/bonus-types";
import type { BonusDetailItem } from "@/lib/validations/bonus";

interface BonusRowDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: BonusListRow;
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

export function BonusRowDetailModal({
  isOpen,
  onClose,
  row,
}: BonusRowDetailModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        closeButtonClassName="rounded-md border border-destructive p-1 text-destructive opacity-100 hover:bg-destructive hover:text-destructive-foreground"
      >
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-6">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
            <span className="min-w-0 break-words">
              {row.bonus_title || row.bonus_type_label}
            </span>
          </DialogTitle>
          <DialogDescription>
            {row.bonus_type_label} • {row.bonus_period}
          </DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{row.employee_id}</Badge>
            <span className="text-sm font-medium text-foreground">
              {row.full_name}
            </span>
            {row.department && (
              <span className="text-sm text-muted-foreground">
                • {row.department}
              </span>
            )}
          </div>
        </DialogHeader>

        {row.detail_data.length > 0 && (
          <div className="space-y-1">
            {row.detail_data.map((item, index) => (
              <DetailRow key={`${item.label}-${index}`} item={item} />
            ))}
          </div>
        )}

        <Card className="border-primary bg-primary text-primary-foreground">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-primary-foreground/80">
              Số Tiền Thưởng
            </p>
            <p className="text-2xl font-bold">{formatCurrency(row.amount)}</p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          {row.is_signed ? (
            <>
              <CheckCircle className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  Nhân viên đã ký nhận
                </p>
                {row.signed_at && (
                  <p className="text-sm text-muted-foreground">
                    Thời gian: {formatTimestampFromDBRaw(row.signed_at)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <Clock className="h-6 w-6 shrink-0 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                Nhân viên chưa ký nhận
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
