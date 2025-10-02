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
import {
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  mustChangePassword?: boolean;
  onPasswordChanged?: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  issues: string[];
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  employeeId,
  mustChangePassword = false,
  onPasswordChanged,
}: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
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

  // Check password strength
  const checkPasswordStrength = (password: string): PasswordStrength => {
    const issues: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      issues.push("Ít nhất 8 ký tự");
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      issues.push("Cần có chữ thường");
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      issues.push("Cần có chữ hoa");
    } else {
      score += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      issues.push("Cần có số");
    } else {
      score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push("Nên có ký tự đặc biệt");
    } else {
      score += 1;
    }

    // Determine strength label and color
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

  // Handle password input change
  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, newPassword: value }));
    if (value) {
      setPasswordStrength(checkPasswordStrength(value));
    } else {
      setPasswordStrength({ score: 0, label: "", color: "", issues: [] });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại");
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

    if (formData.currentPassword === formData.newPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại");
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

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
        // Handle specific error cases
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

  // Handle modal close
  const handleClose = () => {
    // Don't force users to change password
    // if (mustChangePassword && !success) {
    //   setError("Bạn phải đổi mật khẩu để tiếp tục sử dụng hệ thống")
    //   return
    // }

    // Reset form
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswords({
      current: false,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Đổi Mật Khẩu
          </DialogTitle>
          <DialogDescription>
            Thay đổi mật khẩu để bảo vệ tài khoản của bạn.
            {mustChangePassword && (
              <span className="text-yellow-600">
                Lần đầu đổi mật khẩu, vui lòng nhập số CCCD làm mật khẩu hiện
                tại.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">
              Mật khẩu hiện tại
              {mustChangePassword && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Nhập số CCCD nếu chưa đổi lần nào)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder="Nhập mật khẩu hiện tại"
                className="pr-10"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    current: !prev.current,
                  }))
                }
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
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

            {/* Password Strength Indicator */}
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

          {/* Confirm Password */}
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
              (formData.newPassword === formData.confirmPassword ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Mật khẩu khớp
                </p>
              ) : (
                <p className="text-xs text-red-600">Mật khẩu không khớp</p>
              ))}
          </div>

          {/* Error/Success Messages */}
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
                Đổi mật khẩu thành công! Đang chuyển hướng...
              </AlertDescription>
            </Alert>
          )}

          {/* Security Tips */}
          <Alert className="border-blue-200 bg-blue-50">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-700">
              <strong>Lưu ý bảo mật:</strong> Sử dụng mật khẩu mạnh với ít nhất
              8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Đổi Mật Khẩu
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
