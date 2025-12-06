"use client";

import { useState, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ImportError {
  row: number;
  employeeId: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  insertedDaily: number;
  insertedMonthly: number;
  skippedRecords: number;
  errors: ImportError[];
  invalidEmployees: string[];
  importBatchId: string;
}

export default function AttendanceImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleExportErrors = () => {
    if (!result) return;

    setExporting(true);
    try {
      const errorData: Array<{
        STT: number;
        "Mã NV": string;
        Dòng: string;
        "Loại Lỗi": string;
        "Mô Tả Lỗi": string;
      }> = [];

      result.invalidEmployees.forEach((employeeId, index) => {
        errorData.push({
          STT: index + 1,
          "Mã NV": employeeId,
          Dòng: "-",
          "Loại Lỗi": "Mã nhân viên không tồn tại",
          "Mô Tả Lỗi": `Mã nhân viên "${employeeId}" không tồn tại trong hệ thống`,
        });
      });

      result.errors.forEach((err, index) => {
        errorData.push({
          STT: result.invalidEmployees.length + index + 1,
          "Mã NV": err.employeeId || "-",
          Dòng: err.row ? String(err.row) : "-",
          "Loại Lỗi": "Lỗi dữ liệu",
          "Mô Tả Lỗi": err.message,
        });
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(errorData);

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 15 },
        { wch: 8 },
        { wch: 30 },
        { wch: 50 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh Sách Lỗi");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Loi_Import_ChamCong_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/attendance-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Có lỗi xảy ra khi import");
        return;
      }

      setResult(data);
    } catch {
      setError("Có lỗi xảy ra khi upload file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Import Chấm Công</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File Excel Chấm Công</CardTitle>
          <CardDescription>
            Chọn file Excel (.xlsx, .xls) chứa dữ liệu chấm công để import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Chọn file</Label>
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Đã chọn: {file.name}
                </p>
              )}
            </div>
            <Button type="submit" disabled={!file || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Kết quả Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Tổng records</p>
                <p className="text-2xl font-bold">{result.totalRecords}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Daily inserted</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.insertedDaily}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Monthly inserted
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {result.insertedMonthly}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {result.skippedRecords}
                </p>
              </div>
            </div>

            {result.invalidEmployees.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Mã nhân viên không tồn tại</AlertTitle>
                <AlertDescription>
                  {result.invalidEmployees.join(", ")}
                </AlertDescription>
              </Alert>
            )}

            {(result.invalidEmployees.length > 0 ||
              result.errors.length > 0) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleExportErrors}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Xuất Excel Lỗi
                    </>
                  )}
                </Button>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">
                  Chi tiết lỗi ({result.errors.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Dòng</TableHead>
                        <TableHead className="w-32">Mã NV</TableHead>
                        <TableHead>Lỗi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.slice(0, 50).map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{err.row || "-"}</TableCell>
                          <TableCell>{err.employeeId || "-"}</TableCell>
                          <TableCell className="text-red-600">
                            {err.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {result.errors.length > 50 && (
                  <p className="text-sm text-muted-foreground">
                    Hiển thị 50/{result.errors.length} lỗi
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
