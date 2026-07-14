"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Gift, Loader2, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
import type { EmployeeBonusItem } from "@/lib/bonus/bonus-types";

interface BonusListModalProps {
  isOpen: boolean;
  onClose: () => void;
  bonuses: EmployeeBonusItem[] | null;
  isLoading: boolean;
  error: string;
  onSelectBonus: (bonus: EmployeeBonusItem) => void;
}

export function BonusListModal({
  isOpen,
  onClose,
  bonuses,
  isLoading,
  error,
  onSelectBonus,
}: BonusListModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Gift className="w-5 h-5 shrink-0 text-pink-600" />
            <span className="truncate">Tiền Thưởng Của Bạn</span>
          </DialogTitle>
          <DialogDescription>
            Chọn một đợt thưởng để xem chi tiết và ký nhận
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tải danh sách tiền thưởng...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !bonuses || bonuses.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chưa có đợt thưởng nào
          </p>
        ) : (
          <div className="space-y-3">
            {bonuses.map((bonus) => (
              <button
                key={`${bonus.bonus_type}-${bonus.bonus_period}`}
                type="button"
                onClick={() => onSelectBonus(bonus)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold text-foreground">
                    {bonus.bonus_title || bonus.bonus_type_label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {bonus.bonus_type_label} • {bonus.bonus_period}
                  </p>
                  <p className="truncate text-sm font-bold text-foreground">
                    {formatCurrency(bonus.amount)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={bonus.is_signed ? "default" : "secondary"}
                    className="whitespace-nowrap"
                  >
                    {bonus.is_signed ? "Đã ký" : "Chưa ký"}
                  </Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
