"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Download,
  Loader2,
  Search,
  FileSpreadsheet,
} from "lucide-react";

interface AttendanceEmployee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
  attendance: {
    total_hours: number;
    total_days: number;
    total_meal_ot_hours: number;
    total_ot_hours: number;
    sick_days: number;
  } | null;
}

interface Period {
  year: number;
  month: number;
}

interface ApiResponse {
  success: boolean;
  employees: AttendanceEmployee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  periods: Period[];
  departments: string[];
  totalEmployees: number;
  currentPeriod: { year: number; month: number };
}

export default function AttendanceListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const currentDate = new Date();
  const [periodYear, setPeriodYear] = useState(currentDate.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(currentDate.getMonth() + 1);
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeDaily, setIncludeDaily] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const params = new URLSearchParams({
        period_year: periodYear.toString(),
        period_month: periodMonth.toString(),
        ...(department !== "all" && { department }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const res = await fetch(`/api/admin/attendance-employees?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: ApiResponse = await res.json();
      if (!res.ok)
        throw new Error(data.success === false ? "API error" : "Lỗi");

      setEmployees(data.employees || []);
      setPeriods(data.periods || []);
      setDepartments(data.departments || []);
      setTotalEmployees(data.totalEmployees || 0);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [periodYear, periodMonth, department, debouncedSearch, router]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(employees.map((e) => e.employee_id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleExport = async (exportAll: boolean) => {
    setExporting(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const body = {
        period_year: periodYear,
        period_month: periodMonth,
        employee_ids: exportAll ? null : Array.from(selectedIds),
        export_type: exportAll ? "all" : "selected",
        include_daily: includeDaily,
      };

      const res = await fetch("/api/admin/attendance-export", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi xuất file");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BangCong_${periodYear}-${String(periodMonth).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xuất file");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Danh Sách Bảng Công</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bảng Công Nhân Viên
          </CardTitle>
          <CardDescription>
            Xem và xuất bảng công theo tháng. Tổng: {totalEmployees} nhân viên
            có dữ liệu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Kỳ công</label>
              <Select
                value={`${periodYear}-${periodMonth}`}
                onValueChange={(val) => {
                  const [y, m] = val.split("-").map(Number);
                  setPeriodYear(y);
                  setPeriodMonth(m);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem
                      key={`${p.year}-${p.month}`}
                      value={`${p.year}-${p.month}`}
                    >
                      {`${String(p.month).padStart(2, "0")}/${p.year}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Phòng ban</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mã NV, tên..."
                  className="pl-8 w-[200px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="includeDaily"
                checked={includeDaily}
                onCheckedChange={(c) => setIncludeDaily(c === true)}
              />
              <label htmlFor="includeDaily" className="text-sm">
                Xuất chi tiết ngày
              </label>
            </div>

            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                disabled={selectedIds.size === 0 || exporting}
                onClick={() => handleExport(false)}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Xuất đã chọn ({selectedIds.size})
              </Button>
              <Button
                disabled={employees.length === 0 || exporting}
                onClick={() => handleExport(true)}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Xuất tất cả
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          employees.length > 0 &&
                          selectedIds.size === employees.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Mã NV</TableHead>
                    <TableHead>Họ Tên</TableHead>
                    <TableHead>Phòng Ban</TableHead>
                    <TableHead className="text-right">Ngày Công</TableHead>
                    <TableHead className="text-right">Giờ Công</TableHead>
                    <TableHead className="text-right">Giờ TC</TableHead>
                    <TableHead className="text-right">Nghỉ Ốm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Không có dữ liệu bảng công cho kỳ này
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(emp.employee_id)}
                            onCheckedChange={(c) =>
                              handleSelectOne(emp.employee_id, c === true)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono">
                          {emp.employee_id}
                        </TableCell>
                        <TableCell>{emp.full_name}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell className="text-right">
                          {emp.attendance?.total_days ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.attendance?.total_hours ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.attendance?.total_ot_hours ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.attendance?.sick_days ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
