"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  employee_id: string;
  full_name: string;
  department: string | null;
  chuc_vu: string;
  phone_number: string | null;
  is_active: boolean;
}

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess: () => void;
  restrictedRoles?: string[];
}

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "giam_doc", label: "Giám Đốc" },
  { value: "ke_toan", label: "Kế Toán" },
  { value: "nguoi_lap_bieu", label: "Người Lập Biểu" },
  { value: "truong_phong", label: "Trưởng Phòng" },
  { value: "to_truong", label: "Tổ Trưởng" },
  { value: "nhan_vien", label: "Nhân Viên" },
  { value: "van_phong", label: "Văn Phòng" },
];

export default function EmployeeForm({
  employee,
  onSuccess,
  restrictedRoles = [],
}: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    employee_id: employee?.employee_id || "",
    full_name: employee?.full_name || "",
    cccd: "",
    password: "",
    chuc_vu: employee?.chuc_vu || "",
    department: employee?.department ? employee.department : "none_selected",
    phone_number: employee?.phone_number || "",
    is_active: employee?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredRoleOptions = roleOptions.filter(
    (role) => !restrictedRoles.includes(role.value),
  );

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const response = await fetch("/api/admin/employees?limit=1", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments || []);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    fetchDepartments();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Debounced search để optimize performance
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(departmentSearch);

      // Ensure focus is maintained after debounced update
      requestAnimationFrame(() => {
        if (
          searchInputRef.current &&
          document.activeElement !== searchInputRef.current
        ) {
          const wasActive = document.activeElement === searchInputRef.current;
          if (wasActive || departmentSearch) {
            searchInputRef.current.focus();
          }
        }
      });
    }, 150); // 150ms debounce delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [departmentSearch]);

  // Optimized filtering với useMemo và debounced search
  const filteredDepartments = useMemo(() => {
    if (!debouncedSearch.trim()) return departments;

    const searchTerm = debouncedSearch.toLowerCase().trim();
    return departments.filter((dept) => {
      const deptLower = dept.toLowerCase();
      return deptLower.includes(searchTerm);
    });
  }, [departments, debouncedSearch]);

  // Memoized search handler với focus preservation
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const cursorPosition = e.target.selectionStart;

      setDepartmentSearch(value);

      // Preserve focus và cursor position after state update
      requestAnimationFrame(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          if (cursorPosition !== null) {
            searchInputRef.current.setSelectionRange(
              cursorPosition,
              cursorPosition,
            );
          }
        }
      });
    },
    [],
  );

  // Memoized clear search handler
  const handleClearSearch = useCallback(() => {
    setDepartmentSearch("");
    setDebouncedSearch("");
    // Maintain focus after clearing
    requestAnimationFrame(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    });
  }, []);

  // Auto-focus search input when Select opens
  const handleSelectOpenChange = useCallback((open: boolean) => {
    if (open) {
      // Focus search input when dropdown opens
      requestAnimationFrame(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
    }
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = "Mã nhân viên là bắt buộc";
    }

    // Validate employee_id format (alphanumeric, no spaces)
    if (formData.employee_id && !/^[A-Za-z0-9]+$/.test(formData.employee_id)) {
      newErrors.employee_id =
        "Mã nhân viên chỉ được chứa chữ và số, không có khoảng trắng";
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Họ và tên là bắt buộc";
    }

    // CCCD validation (only for new employee creation)
    if (!employee && !formData.cccd.trim()) {
      newErrors.cccd = "CCCD là bắt buộc khi tạo mới";
    }

    if (formData.cccd && !/^\d{12}$/.test(formData.cccd)) {
      newErrors.cccd = "CCCD phải có đúng 12 chữ số";
    }

    // Password validation (optional for updates, required for new if no CCCD)
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.chuc_vu) {
      newErrors.chuc_vu = "Chức vụ là bắt buộc";
    }

    if (
      formData.phone_number &&
      !/^[0-9]{10,11}$/.test(formData.phone_number)
    ) {
      newErrors.phone_number = "Số điện thoại không hợp lệ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("admin_token");
      const url = employee
        ? `/api/admin/employees/${employee.employee_id}`
        : "/api/admin/employees";

      const method = employee ? "PUT" : "POST";

      const submitData = {
        ...formData,
        cccd: formData.cccd || undefined,
        password: formData.password || undefined,
        department:
          formData.department === "none_selected" ? null : formData.department,
      };

      // Remove empty fields for updates
      if (employee) {
        if (!formData.cccd) {
          delete submitData.cccd;
        }
        if (!formData.password) {
          delete submitData.password;
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Có lỗi xảy ra");
      }

      const result = await response.json();
      toast.success(result.message);
      onSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee_id">Mã Nhân Viên *</Label>
          <Input
            id="employee_id"
            value={formData.employee_id}
            onChange={(e) => handleInputChange("employee_id", e.target.value)}
            disabled={loading}
            placeholder="Nhập mã nhân viên"
            className={errors.employee_id ? "border-red-500" : ""}
          />
          {errors.employee_id && (
            <p className="text-sm text-red-500">{errors.employee_id}</p>
          )}
          {employee && (
            <div className="text-xs space-y-1">
              <p className="text-blue-600">
                ℹ️ Thay đổi mã nhân viên sẽ tự động cập nhật tất cả dữ liệu liên
                quan
              </p>
              <p className="text-amber-600">
                ⚠️ Bao gồm: dữ liệu lương, chữ ký, quyền truy cập, và audit logs
              </p>
              <p className="text-green-600">
                ✅ Hệ thống sử dụng database transaction để đảm bảo data
                integrity
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Họ và Tên *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => handleInputChange("full_name", e.target.value)}
            disabled={loading}
            placeholder="Nhập họ và tên"
            className={errors.full_name ? "border-red-500" : ""}
          />
          {errors.full_name && (
            <p className="text-sm text-red-500">{errors.full_name}</p>
          )}
        </div>

        {/* CCCD field - only show for new employee creation */}
        {!employee && (
          <div className="space-y-2">
            <Label htmlFor="cccd">CCCD *</Label>
            <Input
              id="cccd"
              type="text"
              value={formData.cccd}
              onChange={(e) => handleInputChange("cccd", e.target.value)}
              disabled={loading}
              placeholder="Nhập số CCCD (12 chữ số)"
              className={errors.cccd ? "border-red-500" : ""}
              maxLength={12}
            />
            {errors.cccd && (
              <p className="text-sm text-red-500">{errors.cccd}</p>
            )}
            <p className="text-xs text-muted-foreground">
              CCCD sẽ được sử dụng để xác thực và khôi phục mật khẩu
            </p>
          </div>
        )}

        {/* Password field - show for both create and update */}
        <div className="space-y-2">
          <Label htmlFor="password">
            Mật Khẩu {employee ? "(để trống nếu không đổi)" : "(tùy chọn)"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={loading}
              placeholder={
                employee ? "Nhập mật khẩu mới" : "Nhập mật khẩu tùy chỉnh"
              }
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {employee
              ? "Để trống nếu không muốn thay đổi mật khẩu hiện tại"
              : "Nếu để trống, CCCD sẽ được sử dụng làm mật khẩu mặc định"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chuc_vu">Chức Vụ *</Label>
          <Select
            value={formData.chuc_vu}
            onValueChange={(value) => handleInputChange("chuc_vu", value)}
            disabled={loading}
          >
            <SelectTrigger className={errors.chuc_vu ? "border-red-500" : ""}>
              <SelectValue placeholder="Chọn chức vụ" />
            </SelectTrigger>
            <SelectContent>
              {filteredRoleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.chuc_vu && (
            <p className="text-sm text-red-500">{errors.chuc_vu}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Phòng Ban</Label>
          <Select
            value={formData.department}
            onValueChange={(value) => {
              handleInputChange("department", value);
              handleClearSearch(); // Clear search after selection
            }}
            onOpenChange={handleSelectOpenChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn phòng ban" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="sticky top-0 z-10 bg-background border-b px-3 pb-2">
                <div className="flex items-center">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Tìm phòng ban..."
                    value={departmentSearch}
                    onChange={handleSearchChange}
                    className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoComplete="off"
                    spellCheck={false}
                    onBlur={(e) => {
                      // Prevent blur if clicking within SelectContent
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      if (
                        relatedTarget &&
                        relatedTarget.closest('[role="option"]')
                      ) {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                      }
                    }}
                  />
                </div>
                {departmentSearch && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {filteredDepartments.length} kết quả
                  </div>
                )}
              </div>
              <div className="overflow-auto">
                <SelectItem value="none_selected">Không chọn</SelectItem>
                {filteredDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
                {filteredDepartments.length === 0 && debouncedSearch && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {`Không tìm thấy "${debouncedSearch}"`}
                  </div>
                )}
              </div>
            </SelectContent>
          </Select>
          {departments.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Đang tải danh sách phòng ban...
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Số Điện Thoại</Label>
          <Input
            id="phone_number"
            value={formData.phone_number}
            onChange={(e) => handleInputChange("phone_number", e.target.value)}
            disabled={loading}
            placeholder="Nhập số điện thoại"
            className={errors.phone_number ? "border-red-500" : ""}
          />
          {errors.phone_number && (
            <p className="text-sm text-red-500">{errors.phone_number}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => handleInputChange("is_active", checked)}
          disabled={loading}
        />
        <Label htmlFor="is_active">Trạng thái hoạt động</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : employee ? "Cập nhật" : "Tạo mới"}
        </Button>
      </div>
    </form>
  );
}
