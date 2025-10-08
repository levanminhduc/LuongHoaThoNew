"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  issues: string[];
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [formData, setFormData] = useState({
    employeeId: "",
    cccd: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: "",
    color: "",
    issues: [],
  });

  const checkPasswordStrength = (password: string): PasswordStrength => {
    const issues: string[] = [];
    let score = 0;

    if (password.length < 8) {
      issues.push("Ít nhất 8 ký tự");
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      issues.push("Cần có chữ thường");
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      issues.push("Cần có chữ hoa");
    } else {
      score += 1;
    }

    if (!/[0-9]/.test(password)) {
      issues.push("Cần có số");
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push("Nên có ký tự đặc biệt");
    } else {
      score += 1;
    }

    let label = "";
    let color = "";

    if (score <= 2) {
      label = "Yếu";
      color = "bg-red-500";
    } else if (score === 3) {
      label = "Trung bình";
      color = "bg-yellow-500";
    } else if (score === 4) {
      label = "Tốt";
      color = "bg-blue-500";
    } else {
      label = "Mạnh";
      color = "bg-green-500";
    }

    return { score: score * 20, label, color, issues };
  };

  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, newPassword: value }));
    if (value) {
      setPasswordStrength(checkPasswordStrength(value));
    } else {
      setPasswordStrength({ score: 0, label: "", color: "", issues: [] });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.employeeId.trim()) {
      setError("Vui lòng nhập mã nhân viên");
      return false;
    }

    if (!formData.cccd.trim()) {
      setError("Vui lòng nhập số CCCD");
      return false;
    }

    if (!formData.newPassword) {
      setError("Vui lòng nhập mật khẩu mới");
      return false;
    }

    if (formData.newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự");
      return false;
    }

    if (
      !/[a-zA-Z]/.test(formData.newPassword) ||
      !/[0-9]/.test(formData.newPassword)
    ) {
      setError("Mật khẩu mới phải có cả chữ và số");
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_code: formData.employeeId.trim(),
          cccd: formData.cccd.trim(),
          new_password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      } else {
        if (response.status === 429) {
          setError(data.error || "Quá nhiều lần thử. Vui lòng thử lại sau.");
        } else if (response.status === 403) {
          setError(data.error);
        } else if (response.status === 401 || response.status === 404) {
          setError("Thông tin không hợp lệ. Vui lòng kiểm tra lại.");
        } else {
          setError(
            data.error || "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
          );
        }
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      employeeId: "",
      cccd: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswords({
      new: false,
      confirm: false,
    });
    setError("");
    setSuccess(false);
    setPasswordStrength({ score: 0, label: "", color: "", issues: [] });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Quên Mật Khẩu
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              Đặt lại mật khẩu bằng cách xác thực số CCCD của bạn.
            </span>
            <span className="block text-amber-600 font-medium">
              ⚠️ Bạn chỉ có thể sử dụng chức năng này sau 24 giờ kể từ lần đổi
              mật khẩu trước
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-id">Mã nhân viên</Label>
              <Input
                id="employee-id"
                type="text"
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    employeeId: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="Nhập mã nhân viên"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cccd">Số CCCD</Label>
              <Input
                id="cccd"
                type="text"
                value={formData.cccd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cccd: e.target.value }))
                }
                placeholder="Nhập số CCCD"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="pr-10"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {formData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Độ mạnh:
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.score <= 40
                          ? "text-red-600"
                          : passwordStrength.score <= 60
                            ? "text-yellow-600"
                            : passwordStrength.score <= 80
                              ? "text-blue-600"
                              : "text-green-600"
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress value={passwordStrength.score} className="h-2" />

                  {passwordStrength.issues.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {passwordStrength.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="text-yellow-600">•</span> {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Nhập lại mật khẩu mới"
                  className="pr-10"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      confirm: !prev.confirm,
                    }))
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {formData.confirmPassword &&
                formData.newPassword !== formData.confirmPassword && (
                  <p className="text-xs text-red-600">
                    Mật khẩu xác nhận không khớp
                  </p>
                )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu
                  mới.
                </AlertDescription>
              </Alert>
            )}

            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                <strong>Lưu ý:</strong> Vì lý do bảo mật, bạn chỉ có thể sử dụng
                chức năng này sau 24 giờ kể từ lần đổi mật khẩu trước. Nếu cần
                hỗ trợ ngay, vui lòng liên hệ Văn Phòng.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Đặt Lại Mật Khẩu
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
