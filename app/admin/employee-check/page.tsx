"use client";

import { useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  Users,
  UserCheck,
  UserX,
  Download,
  X,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { exportAOAToExcel, getXLSX } from "@/lib/lazy/xlsx";

const EMPLOYEE_ID_ALIASES = [
  "mã nhân viên",
  "employee_id",
  "ma_nhan_vien",
  "mã nv",
  "manv",
  "id",
];

interface CheckResult {
  employeeId: string;
  exists: boolean;
}

async function parseEmployeeIdsFromExcel(buffer: ArrayBuffer): Promise<string[]> {
  const XLSX = await getXLSX();
  const workbook = XLSX.read(buffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
  }) as unknown[][];

  if (jsonData.length < 2) {
    throw new Error("File Excel không có dữ liệu");
  }

  const headers = jsonData[0] as unknown[];
  const rows = jsonData.slice(1);

  let colIndex = 0;
  if (headers.length === 1) {
    colIndex = 0;
  } else {
    const headerStrings = headers.map((h) => String(h).toLowerCase().trim());
    const found = headerStrings.findIndex((h) =>
      EMPLOYEE_ID_ALIASES.some((alias) => h.includes(alias)),
    );
    if (found === -1) {
      throw new Error(
        "Không tìm thấy cột mã nhân viên. Hãy đặt tên cột là: Mã Nhân Viên, employee_id, hoặc mã NV",
      );
    }
    colIndex = found;
  }

  const ids = new Set<string>();
  for (const row of rows) {
    const val = String(row[colIndex] || "").trim();
    if (val && val !== "undefined" && val !== "null") {
      ids.add(val);
    }
  }

  if (ids.size === 0) {
    throw new Error("Không tìm thấy mã nhân viên nào trong file");
  }

  return Array.from(ids);
}

async function fetchAllEmployeeIds(): Promise<Set<string>> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch("/api/admin/employees?limit=10000", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Không thể lấy danh sách nhân viên từ hệ thống");
  }

  const data = await res.json();
  return new Set(
    (data.employees as { employee_id: string }[]).map((e) => e.employee_id),
  );
}

async function exportMissingToExcel(missingIds: string[]) {
  const wsData = [["STT", "Mã Nhân Viên"]];
  missingIds.forEach((id, i) => wsData.push([String(i + 1), id]));

  await exportAOAToExcel(wsData, "danh-sach-nv-thieu.xlsx", "NV Thiếu");
}

export default function EmployeeCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [filter, setFilter] = useState<"all" | "missing" | "found">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        setFile(selected);
        setResults(null);
        setError(null);
      }
    },
    [],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setResults(null);
      setError(null);
    }
  }, []);

  const handleCheck = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const excelIds = await parseEmployeeIdsFromExcel(buffer);
      const dbIds = await fetchAllEmployeeIds();

      const checkResults: CheckResult[] = excelIds
        .map((id) => ({ employeeId: id, exists: dbIds.has(id) }))
        .sort((a, b) => {
          if (a.exists === b.exists)
            return a.employeeId.localeCompare(b.employeeId);
          return a.exists ? 1 : -1;
        });

      setResults(checkResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [file]);

  const clearFile = useCallback(() => {
    setFile(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const totalCount = results?.length ?? 0;
  const foundCount = results?.filter((r) => r.exists).length ?? 0;
  const missingCount = totalCount - foundCount;
  const missingIds =
    results?.filter((r) => !r.exists).map((r) => r.employeeId) ?? [];

  const filteredResults =
    results?.filter((r) => {
      if (filter === "missing") return !r.exists;
      if (filter === "found") return r.exists;
      return true;
    }) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Kiểm Tra Nhân Viên
        </h1>
        <p className="text-muted-foreground">
          Import danh sách mã NV từ Excel để kiểm tra nhân viên thiếu trên hệ
          thống
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File Excel
          </CardTitle>
          <CardDescription>
            File Excel chứa 1 cột mã nhân viên (.xlsx, .xls)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50 cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
            {file ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Kéo thả file hoặc click để chọn
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleCheck} disabled={!file || loading}>
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Đang kiểm tra...
              </>
            ) : (
              "Kiểm Tra"
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Tổng NV trong file
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{foundCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Đã có trên hệ thống
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <UserX className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{missingCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Thiếu trên hệ thống
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Kết Quả Kiểm Tra</CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={filter}
                    onValueChange={(v) =>
                      setFilter(v as "all" | "missing" | "found")
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="missing">Chỉ thiếu</SelectItem>
                      <SelectItem value="found">Chỉ có</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => void exportMissingToExcel(missingIds)}
                    disabled={missingCount === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Xuất DS Thiếu
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <TableHead>Mã Nhân Viên</TableHead>
                    <TableHead className="w-32">Trạng Thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((r, i) => (
                    <TableRow key={r.employeeId}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono">
                        {r.employeeId}
                      </TableCell>
                      <TableCell>
                        {r.exists ? (
                          <Badge variant="default" className="bg-green-600">
                            Có
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Thiếu</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
