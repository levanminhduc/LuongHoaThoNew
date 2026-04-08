"use client";

import { useState, useEffect, useCallback } from "react";
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
import { showNetworkErrorToast } from "@/lib/toast-utils";
import { EmployeeSignatureDateForm } from "@/components/admin/employee-signature-date-form";
import { ManagementSignatureDateForm } from "@/components/admin/management-signature-date-form";

interface ManagementSigInfo {
  id: string;
  signed_by_id: string;
  signed_by_name: string;
  signed_at: string;
}

interface SignedEmployee {
  employee_id: string;
  full_name: string;
  department: string;
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
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState("");

  const isT13 = salaryMonth.endsWith("-13") || salaryMonth.endsWith("-T13");
  const [signedEmployees, setSignedEmployees] = useState<SignedEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [mgmtSigs, setMgmtSigs] = useState<
    Record<string, ManagementSigInfo | null>
  >({
    giam_doc: null,
    ke_toan: null,
    nguoi_lap_bieu: null,
  });
  const [loadingMgmt, setLoadingMgmt] = useState(false);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") : ""}`,
  });

  const effectiveMonth = salaryMonth;

  const fetchAvailableMonths = useCallback(async () => {
    setLoadingMonths(true);
    try {
      const res = await fetch("/api/admin/update-signature-date", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.months) {
        const options = data.months.map((m: string) => ({
          value: m,
          label: formatMonthLabel(m),
        }));
        setAvailableMonths(options);
        if (options.length > 0 && !salaryMonth) {
          setSalaryMonth(options[0].value);
        }
      }
    } catch {
      showNetworkErrorToast();
    } finally {
      setLoadingMonths(false);
    }
  }, []);

  const fetchManagementStatus = useCallback(async () => {
    if (!effectiveMonth) return;
    setLoadingMgmt(true);
    try {
      const res = await fetch(
        `/api/signature-status/${effectiveMonth}?is_t13=${isT13}`,
        { headers: getAuthHeaders() },
      );
      const data = await res.json();
      if (res.ok && data.management_signatures) {
        setMgmtSigs(data.management_signatures);
      }
    } catch {
      showNetworkErrorToast();
    } finally {
      setLoadingMgmt(false);
    }
  }, [effectiveMonth, isT13]);

  const fetchSignedEmployees = useCallback(async () => {
    if (!effectiveMonth) return;
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(
        `/api/admin/update-signature-date?month=${effectiveMonth}&is_t13=${isT13}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();
      if (res.ok) {
        setSignedEmployees(data.signed_employees || []);
      } else {
        console.error("Fetch signed employees error:", data);
        setSignedEmployees([]);
      }
    } catch (err) {
      console.error("Fetch signed employees network error:", err);
      showNetworkErrorToast();
      setSignedEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [effectiveMonth, isT13]);

  useEffect(() => {
    if (open) {
      fetchAvailableMonths();
    }
  }, [open, fetchAvailableMonths]);

  useEffect(() => {
    if (open && salaryMonth) {
      fetchManagementStatus();
      fetchSignedEmployees();
    }
  }, [open, salaryMonth, fetchManagementStatus, fetchSignedEmployees]);

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
              authHeader={getAuthHeaders()}
              onSuccess={onSuccess}
            />

            <ManagementSignatureDateForm
              effectiveMonth={effectiveMonth}
              isT13={isT13}
              mgmtSigs={mgmtSigs}
              loadingMgmt={loadingMgmt}
              authHeader={getAuthHeaders()}
              onSuccess={onSuccess}
              onRefresh={fetchManagementStatus}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
