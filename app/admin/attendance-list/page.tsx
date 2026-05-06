"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  VirtualizedTable,
  type VirtualColumn,
} from "@/components/ui/virtualized-table";
import {
  ArrowLeft,
  Download,
  Loader2,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { useAttendanceEmployeesQuery } from "@/lib/hooks/use-attendance";
import { useAttendanceExportMutation } from "@/lib/hooks/use-bulk-export";
import type { AttendanceEmployee } from "@/lib/hooks/use-attendance";

export default function AttendanceListPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [{ year: currentYear, month: currentMonth }] = useState(() => {
    const [datePart] = getVietnamTimestamp().split(" ");
    const [year, month] = datePart.split("-").map(Number);
    return { year, month };
  });
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeDaily, setIncludeDaily] = useState(false);
  const [limit, setLimit] = useState(50);
  const attendanceQuery = useAttendanceEmployeesQuery({
    periodYear,
    periodMonth,
    limit,
    department: department !== "all" ? department : undefined,
    search: debouncedSearch || undefined,
  });
  const exportMutation = useAttendanceExportMutation();
  const employees = attendanceQuery.data?.employees ?? [];
  const periods = attendanceQuery.data?.periods ?? [];
  const departments = attendanceQuery.data?.departments ?? [];
  const totalEmployees = attendanceQuery.data?.totalEmployees ?? 0;
  const loading = attendanceQuery.isLoading || attendanceQuery.isFetching;
  const exporting = exportMutation.isPending;
  const queryError =
    attendanceQuery.error instanceof Error ? attendanceQuery.error.message : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [periodYear, periodMonth, department, debouncedSearch, limit]);

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
  const attendanceColumns: VirtualColumn<AttendanceEmployee>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={employees.length > 0 && selectedIds.size === employees.length}
          onCheckedChange={handleSelectAll}
        />
      ),
      width: "56px",
      cell: (emp) => (
        <Checkbox
          checked={selectedIds.has(emp.employee_id)}
          onCheckedChange={(checked) =>
            handleSelectOne(emp.employee_id, checked === true)
          }
        />
      ),
    },
    {
      key: "employee_id",
      header: "Mã NV",
      width: "120px",
      cell: (emp) => <span className="font-mono">{emp.employee_id}</span>,
    },
    {
      key: "full_name",
      header: "Họ Tên",
      width: "minmax(180px, 1.4fr)",
      cell: (emp) => emp.full_name,
    },
    {
      key: "department",
      header: "Phòng Ban",
      width: "minmax(160px, 1fr)",
      cell: (emp) => emp.department,
    },
    {
      key: "total_days",
      header: "Ngày Công",
      width: "120px",
      className: "text-right",
      cell: (emp) => emp.attendance?.total_days ?? "-",
    },
    {
      key: "total_hours",
      header: "Giờ Công",
      width: "120px",
      className: "text-right",
      cell: (emp) => emp.attendance?.total_hours ?? "-",
    },
    {
      key: "total_ot_hours",
      header: "Giờ TC",
      width: "110px",
      className: "text-right",
      cell: (emp) => emp.attendance?.total_ot_hours ?? "-",
    },
    {
      key: "sick_days",
      header: "Nghỉ Ốm",
      width: "110px",
      className: "text-right",
      cell: (emp) => emp.attendance?.sick_days ?? "-",
    },
  ];

  const handleExport = async (exportAll: boolean) => {
    setError(null);
    try {
      await exportMutation.mutateAsync({
        period_year: periodYear,
        period_month: periodMonth,
        employee_ids: exportAll ? undefined : Array.from(selectedIds),
        export_type: exportAll ? "all" : "selected",
        include_daily: includeDaily,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xuất file");
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

            <div className="space-y-1">
              <label className="text-sm font-medium">Hiển thị</label>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setSelectedIds(new Set());
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[20, 50, 100, 200].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} dòng
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {(error || queryError) && (
            <Alert variant="destructive">
              <AlertDescription>{error || queryError}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <VirtualizedTable
                data={employees}
                columns={attendanceColumns}
                rowKey={(employee) => employee.employee_id}
                containerHeight={600}
                caption="Danh sách bảng công nhân viên"
                emptyState="Không có dữ liệu bảng công cho kỳ này"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
