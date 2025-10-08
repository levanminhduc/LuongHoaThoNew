"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  FileSpreadsheet,
  BarChart3,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface ImportHistoryRecord {
  id: string;
  session_id: string;
  import_type: "single" | "dual";
  file_names: string[];
  total_records: number;
  success_count: number;
  error_count: number;
  auto_fix_count: number;
  processing_time_ms: number;
  error_summary: {
    validation: number;
    format: number;
    duplicate: number;
    database: number;
    system: number;
  };
  auto_fixes: Array<Record<string, unknown>>;
  detailed_errors: Array<Record<string, unknown>>;
  user_id: string;
  created_at: string;
  status: "completed" | "failed" | "partial";
}

interface ImportHistoryViewerProps {
  className?: string;
}

export function ImportHistoryViewer({
  className = "",
}: ImportHistoryViewerProps) {
  const [history, setHistory] = useState<ImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_imports: 0,
    total_records_processed: 0,
    total_success: 0,
    total_errors: 0,
    total_auto_fixes: 0,
    average_processing_time: 0,
    success_rate: 0,
    status_breakdown: {
      completed: 0,
      failed: 0,
      partial: 0,
    },
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("import_type", typeFilter);
      if (dateFromFilter) params.append("date_from", dateFromFilter);
      if (dateToFilter) params.append("date_to", dateToFilter);

      const response = await fetch(`/api/admin/import-history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.data || []);
        setSummary(data.summary || summary);
      }
    } catch (error) {
      console.error("Error fetching import history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter, typeFilter, dateFromFilter, dateToFilter]);

  const deleteHistoryRecord = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const response = await fetch(`/api/admin/import-history?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchHistory(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting history record:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "failed":
        return "text-red-600 bg-red-50 border-red-200";
      case "partial":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "partial":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      // Format: "HH:MM DD/MM/YYYY" (time first, then date)
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Mock data for demonstration since we don't have the table yet
  const mockHistory: ImportHistoryRecord[] = [
    {
      id: "hist_1",
      session_id: "sess_001",
      import_type: "dual",
      file_names: ["salary_data_jan.xlsx", "deductions_jan.xlsx"],
      total_records: 150,
      success_count: 145,
      error_count: 5,
      auto_fix_count: 12,
      processing_time_ms: 2300,
      error_summary: {
        validation: 2,
        format: 2,
        duplicate: 1,
        database: 0,
        system: 0,
      },
      auto_fixes: [],
      detailed_errors: [],
      user_id: "admin",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      status: "completed",
    },
    {
      id: "hist_2",
      session_id: "sess_002",
      import_type: "single",
      file_names: ["salary_data_feb.xlsx"],
      total_records: 75,
      success_count: 70,
      error_count: 5,
      auto_fix_count: 8,
      processing_time_ms: 1800,
      error_summary: {
        validation: 3,
        format: 1,
        duplicate: 1,
        database: 0,
        system: 0,
      },
      auto_fixes: [],
      detailed_errors: [],
      user_id: "admin",
      created_at: new Date(Date.now() - 172800000).toISOString(),
      status: "partial",
    },
  ];

  // Use mock data if no real data
  const displayHistory = history.length > 0 ? history : mockHistory;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Import History & Analytics
          </CardTitle>
          <CardDescription>
            Track and analyze all import operations with detailed metrics and
            error patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchHistory}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">
                {summary.total_imports}
              </p>
              <p className="text-sm text-blue-600">Total Imports</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">
                {summary.total_records_processed}
              </p>
              <p className="text-sm text-green-600">Records Processed</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">
                {summary.success_rate.toFixed(1)}%
              </p>
              <p className="text-sm text-purple-600">Success Rate</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-700">
                {formatDuration(summary.average_processing_time)}
              </p>
              <p className="text-sm text-orange-600">Avg Processing Time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="single">Single File</SelectItem>
                  <SelectItem value="dual">Dual File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Loading import history...</p>
            </div>
          ) : displayHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No import history found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {displayHistory.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={getStatusColor(record.status)}
                        >
                          {getStatusIcon(record.status)}
                          {record.status}
                        </Badge>
                        <Badge variant="secondary">
                          {record.import_type === "dual"
                            ? "Dual File"
                            : "Single File"}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {formatDate(record.created_at)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteHistoryRecord(record.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Files</p>
                        <p className="font-medium">
                          {record.file_names.join(", ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Records</p>
                        <p className="font-medium">{record.total_records}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="font-medium">
                          {record.total_records > 0
                            ? (
                                (record.success_count / record.total_records) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Processing Time</p>
                        <p className="font-medium">
                          {formatDuration(record.processing_time_ms)}
                        </p>
                      </div>
                    </div>

                    {(record.error_count > 0 || record.auto_fix_count > 0) && (
                      <div className="flex items-center gap-4 text-sm">
                        {record.error_count > 0 && (
                          <span className="text-red-600">
                            {record.error_count} errors
                          </span>
                        )}
                        {record.auto_fix_count > 0 && (
                          <span className="text-blue-600">
                            {record.auto_fix_count} auto-fixes
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
