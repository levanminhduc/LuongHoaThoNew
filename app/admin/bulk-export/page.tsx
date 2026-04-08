"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";

type PayrollType = "monthly" | "t13";

export default function BulkExportPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [payrollType, setPayrollType] = useState<PayrollType>("monthly");
  const [salaryMonth, setSalaryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [salaryYear, setSalaryYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const userStr = localStorage.getItem("user_info");

    if (!token || !userStr) {
      router.push("/admin/login");
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== "admin") {
        router.push("/admin/login");
        return;
      }
    } catch {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("user_info");
      router.push("/admin/login");
      return;
    }

    fetchDepartments(token);
  }, [router]);

  async function fetchDepartments(token: string) {
    setLoadingDepts(true);
    try {
      const res = await fetch("/api/admin/departments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách phòng ban");
      const json = await res.json();

      let depts: string[] = [];
      if (Array.isArray(json)) {
        depts = (json as { name?: string; department?: string }[])
          .map((d) => d.name ?? d.department ?? "")
          .filter(Boolean);
      } else if (json?.departments && Array.isArray(json.departments)) {
        depts = (json.departments as { name?: string; department?: string }[])
          .map((d) => d.name ?? d.department ?? "")
          .filter(Boolean);
      }

      const sorted = [...new Set(depts)].sort((a, b) =>
        a.localeCompare(b, "vi"),
      );
      setDepartments(sorted);
      setSelected(new Set(sorted));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDepts(false);
    }
  }

  function toggleDept(dept: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }

  function handleSelectAll() {
    if (selected.size === departments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(departments));
    }
  }

  function buildSalaryMonth(): string {
    if (payrollType === "t13") {
      return `${salaryYear}-13`;
    }
    return salaryMonth;
  }

  async function handleExport() {
    setExportError(null);
    setExporting(true);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const res = await fetch("/api/admin/bulk-payroll-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          departments: [...selected],
          salary_month: buildSalaryMonth(),
          payroll_type: payrollType,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ?? `Lỗi xuất file (${res.status})`,
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const month = buildSalaryMonth();
      a.download =
        payrollType === "t13"
          ? `Luong13_${salaryYear}_ToanBo.xlsx`
          : `Luong_${month}_ToanBo.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi xuất file",
      );
    } finally {
      setExporting(false);
    }
  }

  const allSelected =
    selected.size === departments.length && departments.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            Xuất Lương Toàn Bộ
          </CardTitle>
          <CardDescription>
            Xuất dữ liệu lương cho nhiều phòng ban vào một file Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payroll-type">Loại Lương</Label>
              <Select
                value={payrollType}
                onValueChange={(v) => setPayrollType(v as PayrollType)}
              >
                <SelectTrigger id="payroll-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Tháng Thường</SelectItem>
                  <SelectItem value="t13">Tháng 13</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {payrollType === "t13" ? (
                <>
                  <Label htmlFor="salary-year">Năm</Label>
                  <Input
                    id="salary-year"
                    type="number"
                    min="2020"
                    max="2099"
                    value={salaryYear}
                    onChange={(e) => setSalaryYear(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="salary-month">Tháng Lương</Label>
                  <Input
                    id="salary-month"
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                  />
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Phòng Ban ({selected.size}/{departments.length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={loadingDepts || departments.length === 0}
              >
                {allSelected ? "Bỏ Chọn Tất Cả" : "Chọn Tất Cả"}
              </Button>
            </div>

            {loadingDepts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải danh sách phòng ban...
              </div>
            ) : departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không tìm thấy phòng ban nào.
              </p>
            ) : (
              <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <div key={dept} className="flex items-center gap-2">
                    <Checkbox
                      id={`dept-${dept}`}
                      checked={selected.has(dept)}
                      onCheckedChange={() => toggleDept(dept)}
                    />
                    <Label
                      htmlFor={`dept-${dept}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {dept}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {exportError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {exportError}
            </p>
          )}

          <Button
            onClick={handleExport}
            disabled={selected.size === 0 || exporting || loadingDepts}
            className="w-full sm:w-auto"
            title={
              selected.size === 0
                ? "Vui lòng chọn ít nhất một phòng ban"
                : undefined
            }
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xuất...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Xuất Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
