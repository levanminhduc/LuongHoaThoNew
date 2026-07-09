/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";

interface Employee {
  employee_id: string;
  full_name: string;
  department: string | null;
  chuc_vu: string;
  phone_number: string | null;
  is_active: boolean;
}

interface EmployeeFormExampleProps {
  employee?: Employee;
  onSuccess?: () => void;
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
] as const;

const createEmployeeFormSchema = (isEditMode: boolean) => {
  return z.object({
    employee_id: z
      .string()
      .min(1, "Mã nhân viên là bắt buộc")
      .max(50, "Mã nhân viên không được vượt quá 50 ký tự")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Mã nhân viên chỉ được chứa chữ, số, gạch dưới và gạch ngang",
      ),
    full_name: z
      .string()
      .min(1, "Họ và tên là bắt buộc")
      .max(255, "Họ và tên không được vượt quá 255 ký tự")
      .regex(
        /^[\p{L}\s]+$/u,
        "Họ và tên chỉ được chứa chữ cái và khoảng trắng",
      ),
    cccd: isEditMode
      ? z
          .string()
          .regex(/^\d{12}$/, "CCCD phải có đúng 12 chữ số")
          .optional()
          .or(z.literal(""))
      : z
          .string()
          .min(1, "CCCD là bắt buộc")
          .regex(/^\d{12}$/, "CCCD phải có đúng 12 chữ số"),
    password: z.string().optional().or(z.literal("")),
    department: z.string().min(1, "Phòng ban là bắt buộc"),
    chuc_vu: z.string().min(1, "Chức vụ là bắt buộc"),
    phone_number: z
      .string()
      .regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số")
      .optional()
      .or(z.literal("")),
    is_active: z.boolean().default(true),
  });
};

type EmployeeFormValues = z.infer<ReturnType<typeof createEmployeeFormSchema>>;

export default function EmployeeFormExample({
  employee,
  onSuccess,
  restrictedRoles = [],
}: EmployeeFormExampleProps) {
  const isEditMode = !!employee;

  const [departments, setDepartments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const filteredRoleOptions = useMemo(
    () => roleOptions.filter((role) => !restrictedRoles.includes(role.value)),
    [restrictedRoles],
  );

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(createEmployeeFormSchema(isEditMode)),
    mode: "onChange",
    defaultValues: {
      employee_id: employee?.employee_id || "",
      full_name: employee?.full_name || "",
      cccd: "",
      password: "",
      department: employee?.department || "none_selected",
      chuc_vu: employee?.chuc_vu || "",
      phone_number: employee?.phone_number || "",
      is_active: employee?.is_active ?? true,
    },
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const params = new URLSearchParams();
        params.set(QUERY_PARAMS.LIMIT, "1");
        const data = await apiClient.get(
          `${ENDPOINTS.employees.list}?${params}`,
        );
        setDepartments(data.departments || []);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    fetchDepartments();
  }, []);

  const departmentOptions = useMemo(
    () => [
      { value: "none_selected", label: "Không chọn" },
      ...[...departments]
        .sort((a, b) =>
          a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }),
        )
        .map((dept) => ({ value: dept, label: dept })),
    ],
    [departments],
  );

  const onSubmit = async (formData: EmployeeFormValues) => {
    setIsSubmitting(true);

    try {
      const submitData: Record<string, unknown> = {
        ...formData,
        department:
          formData.department === "none_selected" ? null : formData.department,
      };

      if (employee) {
        if (!formData.cccd) {
          delete submitData.cccd;
        }
        if (!formData.password) {
          delete submitData.password;
        }
      } else {
        submitData.cccd = formData.cccd || undefined;
        submitData.password = formData.password || undefined;
      }

      const result = employee
        ? await apiClient.put(
            ENDPOINTS.employees.update(employee.employee_id),
            submitData,
          )
        : await apiClient.post(ENDPOINTS.employees.create, submitData);
      showSuccessToast(result.message);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting form:", error);
      showErrorToast(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset();
  };

  const isFormValid = form.formState.isValid;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="employee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mã Nhân Viên *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nhập mã nhân viên (VD: NV001)"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Chỉ chữ, số, gạch dưới và gạch ngang
                </FormDescription>
                {employee && (
                  <div className="text-xs space-y-1 mt-2">
                    <p className="text-blue-600">
                      ℹ️ Thay đổi mã nhân viên sẽ tự động cập nhật tất cả dữ
                      liệu liên quan
                    </p>
                    <p className="text-amber-600">
                      ⚠️ Bao gồm: dữ liệu lương, chữ ký, quyền truy cập, và
                      audit logs
                    </p>
                    <p className="text-green-600">
                      ✅ Hệ thống sử dụng database transaction để đảm bảo data
                      integrity
                    </p>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Họ và Tên *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nhập họ và tên đầy đủ"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!employee && (
            <FormField
              control={form.control}
              name="cccd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CCCD *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập số CCCD (12 chữ số)"
                      disabled={isSubmitting}
                      maxLength={12}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    CCCD sẽ được sử dụng để xác thực và khôi phục mật khẩu
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Mật Khẩu{" "}
                  {employee ? "(để trống nếu không đổi)" : "(tùy chọn)"}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        employee
                          ? "Nhập mật khẩu mới"
                          : "Nhập mật khẩu tùy chỉnh"
                      }
                      disabled={isSubmitting}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  {employee
                    ? "Để trống nếu không muốn thay đổi mật khẩu hiện tại"
                    : "Nếu để trống, CCCD sẽ được sử dụng làm mật khẩu mặc định"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phòng Ban *</FormLabel>
                <FormControl>
                  <Combobox
                    options={departmentOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Chọn phòng ban"
                    searchPlaceholder="Tìm phòng ban..."
                    emptyText="Không tìm thấy phòng ban."
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </FormControl>
                {departments.length === 0 && (
                  <FormDescription>
                    Đang tải danh sách phòng ban...
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="chuc_vu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chức Vụ *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chức vụ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredRoleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số Điện Thoại</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nhập số điện thoại (VD: 0912345678)"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormDescription>10-11 chữ số</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Trạng Thái Hoạt Động
                </FormLabel>
                <FormDescription>
                  Bật để cho phép nhân viên đăng nhập và sử dụng hệ thống
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex flex-col md:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="w-full md:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Đang lưu..." : employee ? "Cập nhật" : "Tạo mới"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            Đặt Lại
          </Button>
        </div>
      </form>
    </Form>
  );
}
