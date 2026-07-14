"use client";

import { useState, Suspense, useRef, useLayoutEffect, useEffect } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { encryptJson, decryptJson } from "@/lib/utils/client-crypto";
import { saveSession, getSession } from "@/lib/auth/secure-session";

const ADMIN_CREDENTIALS_KEY = "admin_saved_credentials";
const CREDENTIALS_KEY_MATERIAL = "hoatho-admin-login-remember-v1";

interface SavedCredentials {
  username: string;
  password: string;
}

function decodeLegacyCredentials(stored: string): SavedCredentials | null {
  try {
    const decoded = decodeURIComponent(atob(stored));
    const data = JSON.parse(decoded);
    if (data.username && data.password) {
      return { username: data.username, password: data.password };
    }
    return null;
  } catch {
    return null;
  }
}

async function saveCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const encrypted = await encryptJson(CREDENTIALS_KEY_MATERIAL, {
    username,
    password,
  }).catch(() => null);
  if (!encrypted) return false;
  try {
    localStorage.setItem(ADMIN_CREDENTIALS_KEY, encrypted);
    return true;
  } catch {
    return false;
  }
}

async function decodeCredentials(): Promise<SavedCredentials | null> {
  const stored = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
  if (!stored) return null;

  try {
    const data = await decryptJson<Partial<SavedCredentials>>(
      CREDENTIALS_KEY_MATERIAL,
      stored,
    );
    if (data.username && data.password) {
      return { username: data.username, password: data.password };
    }
    throw new Error("malformed payload");
  } catch {
    const legacy = decodeLegacyCredentials(stored);
    if (legacy) {
      await saveCredentials(legacy.username, legacy.password);
      return legacy;
    }
    localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
    return null;
  }
}

function clearCredentials(): void {
  localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
}

function LoadingCard({ message }: { message: string }) {
  return (
    <Card className="max-w-md w-full">
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">{message}</p>
      </CardContent>
    </Card>
  );
}

function LoginFormContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      const savedCredentials = await decodeCredentials();
      if (savedCredentials) {
        setUsername(savedCredentials.username);
        setPassword(savedCredentials.password);
        setRememberPassword(true);
        setHasSavedCredentials(true);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const session = await getSession<{ role?: string }>();
      if (!session?.user) {
        setCheckingSession(false);
        return;
      }

      const bouncedHereByMissingAuthCookie = redirectUrl !== null;
      if (bouncedHereByMissingAuthCookie) {
        setCheckingSession(false);
        return;
      }

      router.replace(getDefaultRedirect(session.user.role ?? ""));
    })();
  }, [redirectUrl, router]);

  useLayoutEffect(() => {
    if (cursorPositionRef.current === null || !usernameInputRef.current) {
      return;
    }

    const input = usernameInputRef.current;
    const position = cursorPositionRef.current;

    input.setSelectionRange(position, position);

    cursorPositionRef.current = null;
  }, [username]);

  const handleClearSavedCredentials = () => {
    clearCredentials();
    setUsername("");
    setPassword("");
    setRememberPassword(false);
    setHasSavedCredentials(false);
  };

  const getDefaultRedirect = (role: string): string => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "giam_doc":
        return "/director/dashboard";
      case "ke_toan":
        return "/accountant/dashboard";
      case "nguoi_lap_bieu":
        return "/reporter/dashboard";
      case "truong_phong":
        return "/manager/dashboard";
      case "to_truong":
        return "/supervisor/dashboard";
      case "nhan_vien":
        return "/employee/dashboard";
      case "van_phong":
        return "/admin/employee-management";
      default:
        return "/admin/dashboard";
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        try {
          await saveSession(data.token, data.user);

          if (rememberPassword) {
            setHasSavedCredentials(await saveCredentials(username, password));
          } else {
            clearCredentials();
            setHasSavedCredentials(false);
          }
        } catch {
          setError(
            "Trình duyệt không lưu được phiên đăng nhập. Vui lòng thoát chế độ ẩn danh hoặc cho phép trang web lưu dữ liệu rồi thử lại.",
          );
          return;
        }

        if (
          redirectUrl &&
          redirectUrl.startsWith("/") &&
          !redirectUrl.startsWith("//")
        ) {
          router.push(redirectUrl);
        } else {
          router.push(getDefaultRedirect(data.user?.role));
        }
      } else {
        setError(
          data.error ||
            "Đăng nhập thất bại, liên hệ ban Chuyển Đổi Số để được hỗ trợ.",
        );
      }
    } catch {
      setError(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <LoadingCard message="Đang kiểm tra phiên đăng nhập..." />;
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">
          TRA CỨU VÀ XÁC NHẬN LƯƠNG
        </CardTitle>
        <CardDescription>CÔNG TY MAY HÒA THỌ ĐIỆN BÀN</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const input = e.target;
                const newValue = input.value.toUpperCase();
                cursorPositionRef.current = input.selectionStart;
                setUsername(newValue);
              }}
              placeholder="Nhập tên đăng nhập"
              required
              ref={usernameInputRef}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberPassword}
                onCheckedChange={(checked) =>
                  setRememberPassword(checked === true)
                }
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                Ghi nhớ thông tin đăng nhập
              </label>
            </div>
            {hasSavedCredentials && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSavedCredentials}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa thông tin đã lưu
              </Button>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đăng Nhập
          </Button>

          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Quay lại trang chủ
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export function AdminLoginForm() {
  return (
    <Suspense fallback={<LoadingCard message="Đang tải..." />}>
      <LoginFormContent />
    </Suspense>
  );
}
