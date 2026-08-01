"use client";

import { Button } from "@/components/ui/button";
import { Calendar, FileText, Lock, Loader2, Gift } from "lucide-react";
import { T13_ENABLED } from "@/lib/feature-flags";

interface EmployeeLookupActionsProps {
  onShowDetail: () => void;
  onShowHistory: () => void;
  onShowT13: () => void;
  onShowBonus: () => void;
  onShowPassword: () => void;
  t13Loading: boolean;
}

export function EmployeeLookupActions({
  onShowDetail,
  onShowHistory,
  onShowT13,
  onShowBonus,
  onShowPassword,
  t13Loading,
}: EmployeeLookupActionsProps) {
  return (
    <div
      className={`grid grid-cols-2 ${T13_ENABLED ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-2`}
    >
      <Button
        variant="default"
        size="sm"
        onClick={onShowDetail}
        className="w-full min-h-[44px]"
      >
        <FileText data-icon="inline-start" className="w-4 h-4 flex-shrink-0" />
        <span>Chi Tiết</span>
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={onShowHistory}
        className="w-full min-h-[44px]"
      >
        <Calendar data-icon="inline-start" className="w-4 h-4 flex-shrink-0" />
        <span>Lịch Sử</span>
      </Button>

      {T13_ENABLED && (
        <Button
          variant="default"
          size="sm"
          onClick={onShowT13}
          disabled={t13Loading}
          className="w-full min-h-[44px]"
        >
          {t13Loading ? (
            <Loader2
              data-icon="inline-start"
              className="w-4 h-4 animate-spin"
            />
          ) : (
            <>
              <Calendar
                data-icon="inline-start"
                className="w-4 h-4 flex-shrink-0"
              />
              <span>Lương T13</span>
            </>
          )}
        </Button>
      )}

      <Button
        variant="default"
        size="sm"
        onClick={onShowBonus}
        className="w-full min-h-[44px]"
      >
        <Gift data-icon="inline-start" className="w-4 h-4 flex-shrink-0" />
        <span>Tiền Thưởng</span>
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={onShowPassword}
        className="w-full min-h-[44px]"
      >
        <Lock data-icon="inline-start" className="w-4 h-4 flex-shrink-0" />
        <span>Đổi MK</span>
      </Button>
    </div>
  );
}
