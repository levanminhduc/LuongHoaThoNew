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
  Info,
} from "lucide-react";

const resetPasswordSchema = z
  .object({
    newPassword: newPasswordFieldSchema,
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  cccd: string;
  employeeName: string;
  onPasswordReset?: () => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  employeeId,
  cccd,
  employeeName,
  onPasswordReset,
}: ResetPasswordModalProps) {
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (formData: ResetPasswordFormValues) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/change-password-with-cccd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_code: employeeId,
          cccd: cccd,
          new_password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          onPasswordReset?.();
          handleClose();
        }, 2000);
      } else {
        if (response.status === 429) {
          setError(data.error || "Quá nhiều lần thử. Vui lòng thử lại sau.");
        } else if (response.status === 400) {
          setError(data.error || "Thông tin không hợp lệ");
        } else {
          setError("Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin.");
        }
      }
    } catch (err) {
      console.error("Password reset error:", err);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Đổi Mật Khẩu
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              Đặt mật khẩu mới cho tài khoản của bạn.
            </span>
            <span className="block font-medium text-muted-foreground">
              ⚠️ Đảm bảo bạn đang sử dụng thiết bị cá nhân
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Bạn đang đổi mật khẩu cho:</strong>
                  <div className="mt-1 font-medium">
                    {employeeId} - {employeeName}
                  </div>
                </AlertDescription>
              </Alert>

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
                  nhất 8 ký tự, bao gồm chữ và số. Không chia sẻ mật khẩu với
                  người khác.
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
