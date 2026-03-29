"use client";

import { Button } from "@/components/ui/button";
import { Calendar, FileText, Lock, Loader2 } from "lucide-react";
import { T13_ENABLED } from "@/lib/feature-flags";

interface EmployeeLookupActionsProps {
  onShowDetail: () => void;
  onShowHistory: () => void;
  onShowT13: () => void;
  onShowPassword: () => void;
  t13Loading: boolean;
}

export function EmployeeLookupActions({
  onShowDetail,
  onShowHistory,
  onShowT13,
  onShowPassword,
  t13Loading,
}: EmployeeLookupActionsProps) {
  return (
    <div
      className={`grid grid-cols-2 ${T13_ENABLED ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-2`}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onShowDetail}
        className="w-full min-h-[44px] flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
      >
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span>Chi Tiết</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onShowHistory}
        className="w-full min-h-[44px] flex items-center justify-center gap-2 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
      >
        <Calendar className="w-4 h-4 flex-shrink-0" />
        <span>Lịch Sử</span>
      </Button>

      {T13_ENABLED && (
        <Button
          variant="outline"
          size="sm"
          onClick={onShowT13}
          disabled={t13Loading}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300"
        >
          {t13Loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>Lương T13</span>
            </>
          )}
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onShowPassword}
        className="w-full min-h-[44px] flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300"
      >
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span>Đổi MK</span>
      </Button>
    </div>
  );
}
