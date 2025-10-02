"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Settings,
  Database,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PAYROLL_FIELD_CONFIG } from "@/lib/advanced-excel-parser";
import {
  type ColumnAlias,
  type MappingConfiguration,
} from "@/lib/column-alias-config";

interface AliasFormData {
  database_field: string;
  alias_name: string;
  confidence_score: number;
}

export default function ColumnMappingConfigPage() {
  const [loading, setLoading] = useState(false);
  const [aliases, setAliases] = useState<ColumnAlias[]>([]);
  const [configurations, setConfigurations] = useState<MappingConfiguration[]>(
    [],
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [editingAlias, setEditingAlias] = useState<ColumnAlias | null>(null);
  const [aliasForm, setAliasForm] = useState<AliasFormData>({
    database_field: "",
    alias_name: "",
    confidence_score: 80,
  });
  const [selectedField, setSelectedField] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAliases(), loadConfigurations()]);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const loadAliases = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams({
        limit: "100",
        sort_by: "database_field",
        sort_order: "asc",
      });

      if (selectedField && selectedField !== "all") {
        params.append("database_field", selectedField);
      }

      const response = await fetch(`/api/admin/column-aliases?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setAliases(result.data || []);
      } else {
        throw new Error(result.message || "Lỗi khi tải aliases");
      }
    } catch (error) {
      console.error("Error loading aliases:", error);
      setError("Lỗi khi tải danh sách aliases");
    }
  };

  const loadConfigurations = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/mapping-configurations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setConfigurations(result.data || []);
      } else {
        throw new Error(result.message || "Lỗi khi tải configurations");
      }
    } catch (error) {
      console.error("Error loading configurations:", error);
      setError("Lỗi khi tải danh sách cấu hình");
    }
  };

  const handleCreateAlias = async () => {
    if (!aliasForm.database_field || !aliasForm.alias_name) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/column-aliases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(aliasForm),
      });

      const result = await response.json();
      if (result.success) {
        setMessage("Tạo alias thành công");
        setShowAliasDialog(false);
        resetAliasForm();
        await loadAliases();
      } else {
        setError(result.message || "Lỗi khi tạo alias");
      }
    } catch (error) {
      console.error("Error creating alias:", error);
      setError("Có lỗi xảy ra khi tạo alias");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlias = async () => {
    if (!editingAlias || !aliasForm.alias_name) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/admin/column-aliases/${editingAlias.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            alias_name: aliasForm.alias_name,
            confidence_score: aliasForm.confidence_score,
            is_active: true,
          }),
        },
      );

      const result = await response.json();
      if (result.success) {
        setMessage("Cập nhật alias thành công");
        setShowAliasDialog(false);
        setEditingAlias(null);
        resetAliasForm();
        await loadAliases();
      } else {
        setError(result.message || "Lỗi khi cập nhật alias");
      }
    } catch (error) {
      console.error("Error updating alias:", error);
      setError("Có lỗi xảy ra khi cập nhật alias");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlias = async (alias: ColumnAlias) => {
    if (!confirm(`Bạn có chắc muốn xóa alias "${alias.alias_name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`/api/admin/column-aliases/${alias.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setMessage("Xóa alias thành công");
        await loadAliases();
      } else {
        setError(result.message || "Lỗi khi xóa alias");
      }
    } catch (error) {
      console.error("Error deleting alias:", error);
      setError("Có lỗi xảy ra khi xóa alias");
    } finally {
      setLoading(false);
    }
  };

  const resetAliasForm = () => {
    setAliasForm({
      database_field: "",
      alias_name: "",
      confidence_score: 80,
    });
  };

  const openCreateDialog = () => {
    setEditingAlias(null);
    resetAliasForm();
    setShowAliasDialog(true);
  };

  const openEditDialog = (alias: ColumnAlias) => {
    setEditingAlias(alias);
    setAliasForm({
      database_field: alias.database_field,
      alias_name: alias.alias_name,
      confidence_score: alias.confidence_score,
    });
    setShowAliasDialog(true);
  };

  const getFieldLabel = (field: string) => {
    const config = PAYROLL_FIELD_CONFIG.find((f) => f.field === field);
    return config?.label || field;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const filteredAliases =
    selectedField && selectedField !== "all"
      ? aliases.filter((alias) => alias.database_field === selectedField)
      : aliases;

  const groupedAliases = filteredAliases.reduce(
    (acc, alias) => {
      if (!acc[alias.database_field]) {
        acc[alias.database_field] = [];
      }
      acc[alias.database_field].push(alias);
      return acc;
    },
    {} as { [key: string]: ColumnAlias[] },
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Cấu Hình Column Mapping
          </h1>
          <p className="text-gray-600 mt-2">
            Quản lý aliases và cấu hình mapping cho import Excel linh hoạt
          </p>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="aliases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="aliases" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Column Aliases
            </TabsTrigger>
            <TabsTrigger
              value="configurations"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Saved Configurations
            </TabsTrigger>
          </TabsList>

          {/* Aliases Tab */}
          <TabsContent value="aliases">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-600" />
                      Quản Lý Column Aliases
                    </CardTitle>
                    <CardDescription>
                      Định nghĩa các tên thay thế cho các trường database để
                      auto-mapping linh hoạt
                    </CardDescription>
                  </div>
                  <Button
                    onClick={openCreateDialog}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm Alias
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filter */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="field-filter">
                      Lọc theo Database Field
                    </Label>
                    <Select
                      value={selectedField}
                      onValueChange={setSelectedField}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả fields" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả fields</SelectItem>
                        {PAYROLL_FIELD_CONFIG.map((field) => (
                          <SelectItem key={field.field} value={field.field}>
                            {field.label} ({field.field})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={loadAliases}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>

                {/* Aliases Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Database Field</TableHead>
                        <TableHead>Alias Name</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAliases.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-gray-500"
                          >
                            {loading ? "Đang tải..." : "Không có aliases nào"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAliases.map((alias) => (
                          <TableRow key={alias.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {getFieldLabel(alias.database_field)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {alias.database_field}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {alias.alias_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getConfidenceColor(
                                  alias.confidence_score,
                                )}
                              >
                                {alias.confidence_score}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  alias.is_active ? "default" : "secondary"
                                }
                              >
                                {alias.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{alias.created_by}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(alias)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteAlias(alias)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurations Tab */}
          <TabsContent value="configurations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  Saved Mapping Configurations
                </CardTitle>
                <CardDescription>
                  Các cấu hình mapping đã lưu từ import thành công
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Configuration Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Mappings</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configurations.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-8 text-gray-500"
                          >
                            Chưa có cấu hình nào được lưu
                          </TableCell>
                        </TableRow>
                      ) : (
                        configurations.map((config) => (
                          <TableRow key={config.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {config.config_name}
                                </span>
                                {config.is_default && (
                                  <Badge variant="outline">Default</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {config.description || "Không có mô tả"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {(config as any).configuration_field_mappings
                                  ?.length || 0}{" "}
                                fields
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  config.is_active ? "default" : "secondary"
                                }
                              >
                                {config.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{config.created_by}</div>
                                <div className="text-gray-500">
                                  {new Date(
                                    config.created_at!,
                                  ).toLocaleDateString("vi-VN")}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Alias Dialog */}
        <Dialog open={showAliasDialog} onOpenChange={setShowAliasDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAlias ? "Chỉnh Sửa Alias" : "Tạo Alias Mới"}
              </DialogTitle>
              <DialogDescription>
                {editingAlias
                  ? "Cập nhật thông tin alias cho trường database"
                  : "Thêm tên thay thế mới cho trường database"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="database_field">Database Field</Label>
                <Select
                  value={aliasForm.database_field}
                  onValueChange={(value) =>
                    setAliasForm((prev) => ({ ...prev, database_field: value }))
                  }
                  disabled={!!editingAlias}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn database field" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYROLL_FIELD_CONFIG.map((field) => (
                      <SelectItem key={field.field} value={field.field}>
                        {field.label} ({field.field})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="alias_name">Alias Name</Label>
                <Input
                  id="alias_name"
                  value={aliasForm.alias_name}
                  onChange={(e) =>
                    setAliasForm((prev) => ({
                      ...prev,
                      alias_name: e.target.value,
                    }))
                  }
                  placeholder="Nhập tên thay thế (ví dụ: Mã NV, Employee ID)"
                />
              </div>

              <div>
                <Label htmlFor="confidence_score">
                  Confidence Score (0-100)
                </Label>
                <Input
                  id="confidence_score"
                  type="number"
                  min="0"
                  max="100"
                  value={aliasForm.confidence_score}
                  onChange={(e) =>
                    setAliasForm((prev) => ({
                      ...prev,
                      confidence_score: parseInt(e.target.value) || 80,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAliasDialog(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={editingAlias ? handleUpdateAlias : handleCreateAlias}
                disabled={loading}
              >
                {loading
                  ? "Đang xử lý..."
                  : editingAlias
                    ? "Cập nhật"
                    : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
