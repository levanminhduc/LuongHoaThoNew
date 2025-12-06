"use client";

import type React from "react";

import { useState, Suspense, useRef, useLayoutEffect } from "react";
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
import { Loader2, Shield, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function LoginFormContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (cursorPositionRef.current === null || !usernameInputRef.current) {
      return;
    }

    const input = usernameInputRef.current;
    const position = cursorPositionRef.current;

    input.setSelectionRange(position, position);

    cursorPositionRef.current = null;
  }, [username]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("user_info", JSON.stringify(data.user));

        if (redirectUrl && redirectUrl.startsWith("/")) {
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
      setError("Có lỗi xảy ra khi đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Đăng Nhập Hệ Thống</CardTitle>
        <CardDescription>
          Hỗ trợ tất cả roles: Admin, Giám Đốc, Kế Toán, Người Lập Biểu, Trưởng
          Phòng, Tổ Trưởng, Nhân Viên
        </CardDescription>
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
    <Suspense
      fallback={
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Đăng Nhập Hệ Thống</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
