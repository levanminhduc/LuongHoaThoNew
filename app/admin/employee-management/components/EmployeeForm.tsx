"use client";

import { useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useEmployeeMutation,
  useEmployeesQuery,
} from "@/lib/hooks/use-employees";

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
    department: employee?.department ? employee.department : "",
    phone_number: employee?.phone_number || "",
    is_active: employee?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [openDepartment, setOpenDepartment] = useState(false);
  const departmentsQuery = useEmployeesQuery({ limit: 1 });
  const employeeMutation = useEmployeeMutation();
  const loading = employeeMutation.isPending;
  const departments = departmentsQuery.data?.departments ?? [];

  const filteredRoleOptions = roleOptions.filter(
    (role) => !restrictedRoles.includes(role.value),
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = "Mã nhân viên là bắt buộc";
    }

    if (formData.employee_id && !/^[A-Za-z0-9]+$/.test(formData.employee_id)) {
      newErrors.employee_id =
        "Mã nhân viên chỉ được chứa chữ và số, không có khoảng trắng";
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Họ và tên là bắt buộc";
    }

    if (!employee && !formData.cccd.trim()) {
      newErrors.cccd = "CCCD là bắt buộc khi tạo mới";
    }

    if (formData.cccd && !/^\d{12}$/.test(formData.cccd)) {
      newErrors.cccd = "CCCD phải có đúng 12 chữ số";
    }

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

    try {
      const submitData = {
        ...formData,
        cccd: formData.cccd || undefined,
        password: formData.password || undefined,
        department: formData.department || null,
      };

      if (employee) {
        if (!formData.cccd) {
          delete submitData.cccd;
        }
        if (!formData.password) {
          delete submitData.password;
        }
      }

      const result = employee
        ? await employeeMutation.mutateAsync({
            action: "update",
            employee: submitData,
            originalEmployeeId: employee.employee_id,
          })
        : await employeeMutation.mutateAsync({
            action: "create",
            employee: submitData,
          });
      toast.success(result.message);
      onSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4 px-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Row 1: Basic Info */}
        <div className="space-y-2">
          <Label
            htmlFor="employee_id"
            className="text-sm font-semibold text-foreground/90 mb-1.5 block"
          >
            Mã Nhân Viên *
          </Label>
          <Input
            id="employee_id"
            value={formData.employee_id}
            onChange={(e) => handleInputChange("employee_id", e.target.value)}
            disabled={loading}
            placeholder="Nhập mã nhân viên"
            className={cn(
              "h-10 w-full",
              errors.employee_id ? "border-red-500" : "",
            )}
          />
          <div className="min-h-[1.25rem]">
            {errors.employee_id && (
              <p className="text-xs text-red-500 font-medium">
                {errors.employee_id}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="full_name"
            className="text-sm font-semibold text-foreground/90 mb-1.5 block"
          >
            Họ và Tên *
          </Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => handleInputChange("full_name", e.target.value)}
            disabled={loading}
            placeholder="Nhập họ và tên"
            className={cn(
              "h-10 w-full",
              errors.full_name ? "border-red-500" : "",
            )}
          />
          <div className="min-h-[1.25rem]">
            {errors.full_name && (
              <p className="text-xs text-red-500 font-medium">
                {errors.full_name}
              </p>
            )}
          </div>
        </div>

        {/* Full-width Warning for existing employees */}
        {employee && (
          <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100/50">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs uppercase tracking-wider mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">
                ℹ️
              </span>
              Lưu ý khi thay đổi mã nhân viên
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[11px] leading-relaxed">
              <p className="text-blue-600/80">
                • Tự động cập nhật lương, chữ ký và phân quyền.
              </p>
              <p className="text-amber-600/80">
                • ⚠️ Ảnh hưởng đến lịch sử audit logs cũ.
              </p>
              <p className="text-green-600/80 md:col-span-2">
                • ✅ Đảm bảo tính nhất quán qua transactions.
              </p>
            </div>
          </div>
        )}

        {/* Row 2: Auth Info */}
        {!employee && (
          <div className="space-y-2">
            <Label
              htmlFor="cccd"
              className="text-sm font-semibold text-foreground/90 mb-1.5 block"
            >
              CCCD *
            </Label>
            <Input
              id="cccd"
              type="text"
              value={formData.cccd}
              onChange={(e) => handleInputChange("cccd", e.target.value)}
              disabled={loading}
              placeholder="Nhập số CCCD (12 chữ số)"
              className={cn("h-10 w-full", errors.cccd ? "border-red-500" : "")}
              maxLength={12}
            />
            <div className="min-h-[1.25rem]">
              {errors.cccd ? (
                <p className="text-xs text-red-500 font-medium">
                  {errors.cccd}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">
                  * Dùng để xác thực
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-semibold text-foreground/90 mb-1.5 block"
          >
            Mật Khẩu {employee ? "(đổi mới)" : "(tùy chọn)"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={loading}
              placeholder={employee ? "Mật khẩu mới" : "CCCD làm mặc định"}
              className={cn(
                "h-10 w-full pr-10",
                errors.password ? "border-red-500" : "",
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-10 px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <div className="min-h-[1.25rem]">
            {errors.password ? (
              <p className="text-xs text-red-500 font-medium">
                {errors.password}
              </p>
            ) : employee ? (
              <p className="text-[10px] text-muted-foreground italic">
                * Để trống nếu không đổi
              </p>
            ) : null}
          </div>
        </div>

        {/* Row 3: Role and Department */}
        <div className="space-y-2 flex flex-col items-stretch">
          <Label
            htmlFor="chuc_vu"
            className="text-sm font-semibold text-foreground/90 mb-1.5 block leading-none"
          >
            Chức Vụ *
          </Label>
          <Select
            value={formData.chuc_vu}
            onValueChange={(value) => handleInputChange("chuc_vu", value)}
            disabled={loading}
          >
            <SelectTrigger
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                errors.chuc_vu ? "border-red-500" : "",
              )}
            >
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
          <div className="min-h-[1.25rem]">
            {errors.chuc_vu && (
              <p className="text-xs text-red-500 font-medium">
                {errors.chuc_vu}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 flex flex-col items-stretch">
          <Label
            htmlFor="department"
            className="text-sm font-semibold text-foreground/90 mb-1.5 block leading-none"
          >
            Phòng Ban
          </Label>
          <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openDepartment}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground/80 hover:text-foreground hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                <span className="truncate">
                  {formData.department ? formData.department : "Chọn phòng ban"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Tìm phòng ban..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy phòng ban nào.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="none_selected"
                      onSelect={() => {
                        handleInputChange("department", "");
                        setOpenDepartment(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.department === ""
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      Không chọn
                    </CommandItem>
                    {departments.map((dept) => (
                      <CommandItem
                        key={dept}
                        value={dept}
                        onSelect={(currentValue) => {
                          handleInputChange(
                            "department",
                            currentValue === formData.department
                              ? ""
                              : currentValue,
                          );
                          setOpenDepartment(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.department === dept
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {dept}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div className="min-h-[1.25rem]" />
        </div>

        {/* Row 4: Phone and Status */}
        <div className="space-y-2">
          <Label
            htmlFor="phone_number"
            className="text-sm font-semibold text-foreground/90 mb-1.5 block"
          >
            Số Điện Thoại
          </Label>
          <Input
            id="phone_number"
            value={formData.phone_number}
            onChange={(e) => handleInputChange("phone_number", e.target.value)}
            disabled={loading}
            placeholder="Nhập số điện thoại"
            className={cn(
              "h-10 w-full",
              errors.phone_number ? "border-red-500" : "",
            )}
          />
          <div className="min-h-[1.25rem]">
            {errors.phone_number && (
              <p className="text-xs text-red-500 font-medium">
                {errors.phone_number}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground/90 mb-1.5 block">
            Trạng Thái
          </Label>
          <div className="flex items-center space-x-3 bg-muted/30 h-10 px-3 rounded-md border border-input/50 transition-all w-full">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                handleInputChange("is_active", checked)
              }
              disabled={loading}
            />
            <Label
              htmlFor="is_active"
              className="cursor-pointer font-medium text-xs text-foreground/70"
            >
              Đang hoạt động
            </Label>
          </div>
          <div className="min-h-[1.25rem]" />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
        <Button
          type="submit"
          disabled={loading}
          className="min-w-[120px] shadow-sm"
        >
          {loading ? "Đang xử lý..." : employee ? "Cập nhật" : "Tạo mới"}
        </Button>
      </div>
    </form>
  );
}
