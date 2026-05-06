"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CalendarClock, Loader2 } from "lucide-react";
import { EmployeeSignatureDateForm } from "@/components/admin/employee-signature-date-form";
import { ManagementSignatureDateForm } from "@/components/admin/management-signature-date-form";
import {
  useSignatureDateMonthsQuery,
  useSignatureStatusQuery,
  useSignedEmployeesQuery,
} from "@/lib/hooks/use-dashboard";
import type { SignedEmployee } from "@/lib/hooks/use-dashboard";

interface ManagementSigInfo {
  id: string;
  signed_by_id: string;
  signed_by_name: string;
  signed_at: string;
}

interface MonthOption {
  value: string;
  label: string;
}

interface UpdateSignatureDateDialogProps {
  onSuccess?: () => void;
}

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  const num = parseInt(monthNum, 10);
  if (num === 13 || monthNum.toUpperCase() === "T13")
    return `Tháng 13 - ${year} (T13)`;
  return `Tháng ${num} - ${year}`;
}

export function UpdateSignatureDateDialog({
  onSuccess,
}: UpdateSignatureDateDialogProps) {
  const [open, setOpen] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState("");

  const isT13 = salaryMonth.endsWith("-13") || salaryMonth.endsWith("-T13");
  const emptyMgmtSigs: Record<string, ManagementSigInfo | null> = {
    giam_doc: null,
    ke_toan: null,
    nguoi_lap_bieu: null,
  };
  const effectiveMonth = salaryMonth;
  const monthsQuery = useSignatureDateMonthsQuery(open);
  const statusQuery = useSignatureStatusQuery<{
    management_signatures: Record<string, ManagementSigInfo | null>;
  }>(effectiveMonth, open && Boolean(effectiveMonth));
  const signedEmployeesQuery = useSignedEmployeesQuery(
    effectiveMonth,
    isT13,
    open && Boolean(effectiveMonth),
  );
  const availableMonths: MonthOption[] = (monthsQuery.data?.months ?? []).map(
    (month) => ({
      value: month,
      label: formatMonthLabel(month),
    }),
  );
  const loadingMonths = monthsQuery.isLoading || monthsQuery.isFetching;
  const signedEmployees: SignedEmployee[] =
    signedEmployeesQuery.data?.signed_employees ?? [];
  const loadingEmployees =
    signedEmployeesQuery.isLoading || signedEmployeesQuery.isFetching;
  const mgmtSigs = statusQuery.data?.management_signatures ?? emptyMgmtSigs;
  const loadingMgmt = statusQuery.isLoading || statusQuery.isFetching;

  useEffect(() => {
    if (availableMonths.length > 0 && !salaryMonth) {
      setSalaryMonth(availableMonths[0].value);
    }
  }, [availableMonths, salaryMonth]);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <CalendarClock className="h-4 w-4" />
        Cập Nhật Ngày Ký
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cập Nhật Ngày Ký Lương</DialogTitle>
            <DialogDescription>
              Cập nhật ngày ký cho nhân viên và quản lý
              {salaryMonth && (
                <span className="ml-2 font-medium">
                  — {isT13 ? "Lương T13" : "Lương hàng tháng"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1">
                <Label>Tháng lương</Label>
                {loadingMonths ? (
                  <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải...
                  </div>
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                  >
                    {availableMonths.length === 0 && (
                      <option value="">Không có dữ liệu</option>
                    )}
                    {availableMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <EmployeeSignatureDateForm
              effectiveMonth={effectiveMonth}
              isT13={isT13}
              signedEmployees={signedEmployees}
              loadingEmployees={loadingEmployees}
              onSuccess={onSuccess}
            />

            <ManagementSignatureDateForm
              effectiveMonth={effectiveMonth}
              isT13={isT13}
              mgmtSigs={mgmtSigs}
              loadingMgmt={loadingMgmt}
              onSuccess={onSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
