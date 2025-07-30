"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield } from "lucide-react"
import Link from "next/link"

export function AdminLoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Lưu token và user info vào localStorage
        localStorage.setItem("admin_token", data.token)
        localStorage.setItem("user_info", JSON.stringify(data.user))

        // Redirect based on user role
        const userRole = data.user?.role
        switch (userRole) {
          case 'admin':
            router.push("/admin/dashboard")
            break
          case 'truong_phong':
            router.push("/manager/dashboard")
            break
          case 'to_truong':
            router.push("/supervisor/dashboard")
            break
          case 'nhan_vien':
            router.push("/employee/dashboard")
            break
          default:
            router.push("/admin/dashboard") // Fallback to admin dashboard
        }
      } else {
        setError(data.error || "Đăng nhập thất bại, liên hệ ban Chuyển Đổi Số để được hỗ trợ.")
      }
    } catch (error) {
      setError("Có lỗi xảy ra khi đăng nhập")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Đăng Nhập Hệ Thống</CardTitle>
        <CardDescription>
          Hỗ trợ tất cả roles: Admin, Trưởng Phòng, Tổ Trưởng, Nhân Viên
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
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
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
  )
}
