"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { newPasswordFieldSchema } from "@/lib/validations/auth";
import {
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: newPasswordFieldSchema,
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  mustChangePassword?: boolean;
  onPasswordChanged?: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  employeeId,
  mustChangePassword = false,
  onPasswordChanged,
}: ChangePasswordModalProps) {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (formData: ChangePasswordFormValues) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/employee/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onPasswordChanged?.();
          handleClose();
        }, 2000);
      } else {
        if (data.error?.includes("không đúng")) {
          setError(
            "Mật khẩu hiện tại không đúng. Nếu bạn chưa đổi mật khẩu lần nào, hãy nhập số CCCD.",
          );
        } else if (data.error?.includes("locked")) {
          setError(
            "Tài khoản đã bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau.",
          );
        } else {
          setError(data.error || "Không thể đổi mật khẩu");
        }
      }
    } catch (err) {
      console.error("Password change error:", err);
      setError("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setError("");
    setSuccess(false);
    onClose();
  };

  const newPasswordValue = form.watch("newPassword");
  const confirmPasswordValue = form.watch("confirmPassword");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Đổi Mật Khẩu
          </DialogTitle>
          <DialogDescription>
            Thay đổi mật khẩu để bảo vệ tài khoản của bạn.
            {mustChangePassword && (
              <span className="block text-muted-foreground">
                Lần đầu đổi mật khẩu, vui lòng nhập số CCCD làm mật khẩu hiện
                tại.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Mật khẩu hiện tại
                      {mustChangePassword && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Nhập số CCCD nếu chưa đổi lần nào)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Nhập mật khẩu hiện tại"
                        autoComplete="current-password"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu mới</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Nhập mật khẩu mới"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                    </FormControl>
                    <PasswordStrengthIndicator password={newPasswordValue} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Nhập lại mật khẩu mới"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                    </FormControl>
                    {confirmPasswordValue.length > 0 &&
                      newPasswordValue === confirmPasswordValue && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          Mật khẩu khớp
                        </p>
                      )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Đổi mật khẩu thành công! Đang chuyển hướng...
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Lưu ý bảo mật:</strong> Sử dụng mật khẩu mạnh với ít
                  nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc
                  biệt.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2
                      data-icon="inline-start"
                      className="h-4 w-4 animate-spin"
                    />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Lock data-icon="inline-start" className="h-4 w-4" />
                    Đổi Mật Khẩu
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
