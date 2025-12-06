"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ManagerDashboard from "@/components/ManagerDashboard";

interface User {
  employee_id: string;
  username: string;
  role: string;
  department: string;
  allowed_departments?: string[];
  permissions: string[];
}

export default function ManagerDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    try {
      const token = localStorage.getItem("admin_token");
      const userStr = localStorage.getItem("user_info");

      if (!token || !userStr) {
        router.push("/admin/login");
        return;
      }

      const userData = JSON.parse(userStr);

      // Check if user has manager role
      if (userData.role !== "truong_phong") {
        // Redirect based on actual role
        switch (userData.role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "to_truong":
            router.push("/supervisor/dashboard");
            break;
          case "nhan_vien":
            router.push("/employee/dashboard");
            break;
          default:
            router.push("/admin/login");
        }
        return;
      }

      setUser(userData);
    } catch (error) {
      console.error("Authentication check error:", error);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("user_info");
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore error
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_info");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return <ManagerDashboard user={user} onLogout={handleLogout} />;
}
