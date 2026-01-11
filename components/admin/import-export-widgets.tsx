import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

interface ImportProgressProps {
  fileName?: string;
  progress: number;
  currentRecord?: number;
  totalRecords?: number;
  status:
    | "idle"
    | "processing"
    | "validating"
    | "importing"
    | "complete"
    | "error";
  message?: string;
}

export function ImportProgress({
  fileName,
  progress,
  currentRecord,
  totalRecords,
  status,
  message,
}: ImportProgressProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "processing":
        return {
          icon: <Upload className="h-5 w-5 text-blue-600 animate-pulse" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          label: "Đang xử lý...",
        };
      case "validating":
        return {
          icon: <Clock className="h-5 w-5 text-yellow-600 animate-pulse" />,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          label: "Đang kiểm tra dữ liệu...",
        };
      case "importing":
        return {
          icon: <Upload className="h-5 w-5 text-blue-600 animate-pulse" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          label: "Đang import...",
        };
      case "complete":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          color: "text-green-600",
          bgColor: "bg-green-50",
          label: "Hoàn tất",
        };
      case "error":
        return {
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          color: "text-red-600",
          bgColor: "bg-red-50",
          label: "Lỗi",
        };
      default:
        return {
          icon: <FileSpreadsheet className="h-5 w-5 text-gray-600" />,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          label: "Chờ xử lý",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {config.icon}
            Import Dữ Liệu
          </CardTitle>
          <Badge className={config.bgColor}>
            <span className={config.color}>{config.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="truncate">{fileName}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tiến trình</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentRecord !== undefined && totalRecords !== undefined && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Đang xử lý:</span>
            <span className="font-medium">
              {currentRecord.toLocaleString()} / {totalRecords.toLocaleString()}{" "}
              bản ghi
            </span>
          </div>
        )}

        {message && (
          <Alert className={config.bgColor}>
            <AlertDescription className={config.color}>
              {message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface ImportResultSummaryProps {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  skippedCount?: number;
  overwriteCount?: number;
  processingTime?: string;
  onViewErrors?: () => void;
  onViewSuccess?: () => void;
}

export function ImportResultSummary({
  totalRecords,
  successCount,
  errorCount,
  skippedCount = 0,
  overwriteCount = 0,
  processingTime,
  onViewErrors,
  onViewSuccess,
}: ImportResultSummaryProps) {
  const successRate =
    totalRecords > 0 ? (successCount / totalRecords) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {errorCount === 0 ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          Kết Quả Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Tổng số"
            value={totalRecords}
            icon={<FileSpreadsheet className="h-4 w-4 text-gray-400" />}
            onClick={onViewSuccess}
          />
          <StatCard
            label="Thành công"
            value={successCount}
            icon={<CheckCircle className="h-4 w-4 text-green-600" />}
            className="text-green-600"
            onClick={onViewSuccess}
          />
          <StatCard
            label="Lỗi"
            value={errorCount}
            icon={<XCircle className="h-4 w-4 text-red-600" />}
            className="text-red-600"
            onClick={errorCount > 0 ? onViewErrors : undefined}
          />
          <StatCard
            label="Bỏ qua"
            value={skippedCount}
            icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}
            className="text-yellow-600"
          />
        </div>

        {overwriteCount > 0 && (
          <Alert>
            <AlertDescription>
              Đã ghi đè {overwriteCount} bản ghi trùng lặp
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tỷ lệ thành công</span>
            <span className="font-medium">{successRate.toFixed(1)}%</span>
          </div>
          <Progress
            value={successRate}
            className={`h-2 ${errorCount > 0 ? "bg-red-100" : "bg-green-100"}`}
          />
        </div>

        {processingTime && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Thời gian xử lý: {processingTime}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function StatCard({ label, value, icon, className, onClick }: StatCardProps) {
  const isClickable = onClick !== undefined;

  return (
    <div
      className={`p-4 bg-muted rounded-lg ${isClickable ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${className || ""}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  rowCount?: number;
  columnCount?: number;
  previewData?: Array<Record<string, string | number>>;
  onRemove?: () => void;
}

export function FilePreview({
  fileName,
  fileSize,
  fileType,
  rowCount,
  columnCount,
  previewData,
  onRemove,
}: FilePreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <span className="truncate">{fileName}</span>
          </CardTitle>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-600 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Kích thước:</span>
            <span className="ml-2 font-medium">{formatFileSize(fileSize)}</span>
          </div>
          <div>
            <span className="text-gray-600">Định dạng:</span>
            <span className="ml-2 font-medium">{fileType}</span>
          </div>
          {rowCount !== undefined && (
            <div>
              <span className="text-gray-600">Số dòng:</span>
              <span className="ml-2 font-medium">
                {rowCount.toLocaleString()}
              </span>
            </div>
          )}
          {columnCount !== undefined && (
            <div>
              <span className="text-gray-600">Số cột:</span>
              <span className="ml-2 font-medium">{columnCount}</span>
            </div>
          )}
        </div>

        {previewData && previewData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Xem trước (5 dòng đầu):
            </p>
            <div className="border rounded-lg overflow-auto max-h-[200px]">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      {Object.values(row).map((value, colIdx) => (
                        <td key={colIdx} className="px-3 py-2">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
