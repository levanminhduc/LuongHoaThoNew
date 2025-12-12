"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import Link from "next/link";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  issues: string[];
}

const forgotPasswordSchema = z
  .object({
    employeeId: z.string().min(1, "Mã nhân viên là bắt buộc"),
    cccd: z.string().min(1, "Số CCCD là bắt buộc"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .regex(/[a-zA-Z]/, "Mật khẩu phải có chữ cái")
      .regex(/[0-9]/, "Mật khẩu phải có số"),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function TestForgotPasswordPage() {
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

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: {
      employeeId: "",
      cccd: "",
      newPassword: "",
      confirmPassword: "",
    },
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
    form.setValue("newPassword", value, { shouldValidate: true });
    if (value) {
      setPasswordStrength(checkPasswordStrength(value));
    } else {
      setPasswordStrength({ score: 0, label: "", color: "", issues: [] });
    }
  };

  const onSubmit = async (formData: ForgotPasswordFormValues) => {
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
        form.reset();
        setPasswordStrength({ score: 0, label: "", color: "", issues: [] });
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

  const newPasswordValue = form.watch("newPassword");
  const confirmPasswordValue = form.watch("confirmPassword");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-6 sm:mb-8 px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Test Quên Mật Khẩu
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-blue-900 mt-2">
            CÔNG TY MAY HÒA THỌ ĐIỆN BÀN
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Đặt lại mật khẩu bằng cách xác thực số CCCD của bạn
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Quên Mật Khẩu
            </CardTitle>
            <CardDescription>
              Nhập thông tin để đặt lại mật khẩu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã nhân viên</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          placeholder="Nhập mã nhân viên"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cccd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số CCCD</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nhập số CCCD"
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
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPasswords.new ? "text" : "password"}
                            onChange={(e) =>
                              handlePasswordChange(e.target.value)
                            }
                            placeholder="Nhập mật khẩu mới"
                            className="pr-10"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                new: !prev.new,
                              }))
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
                      </FormControl>

                      {newPasswordValue && (
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
                          <Progress
                            value={passwordStrength.score}
                            className="h-2"
                          />

                          {passwordStrength.issues.length > 0 && (
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {passwordStrength.issues.map((issue, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-center gap-1"
                                >
                                  <span className="text-yellow-600">•</span>{" "}
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
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
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPasswords.confirm ? "text" : "password"}
                            placeholder="Nhập lại mật khẩu mới"
                            className="pr-10"
                            disabled={loading}
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
                      </FormControl>
                      {confirmPasswordValue &&
                        newPasswordValue !== confirmPasswordValue && (
                          <p className="text-xs text-red-600">
                            Mật khẩu xác nhận không khớp
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
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật
                      khẩu mới.
                    </AlertDescription>
                  </Alert>
                )}

                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-700">
                    <strong>Lưu ý:</strong> Vì lý do bảo mật, bạn chỉ có thể sử
                    dụng chức năng này sau 24 giờ kể từ lần đổi mật khẩu trước.
                    Nếu cần hỗ trợ ngay, vui lòng liên hệ Văn Phòng.
                  </AlertDescription>
                </Alert>

                <div className="text-xs text-muted-foreground">
                  Trang này sử dụng{" "}
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                    @/components/ui/form
                  </code>{" "}
                  với react-hook-form và zod validation
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
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
                  <Button variant="outline" asChild>
                    <Link href="/employee/lookup">Quay Lại</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
