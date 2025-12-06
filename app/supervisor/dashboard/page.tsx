"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SupervisorDashboard from "@/components/SupervisorDashboard";

interface User {
  employee_id: string;
  username: string;
  role: string;
  department: string;
  permissions: string[];
}

export default function SupervisorDashboardPage() {
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

      // Check if user has supervisor role
      if (userData.role !== "to_truong") {
        // Redirect based on actual role
        switch (userData.role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "truong_phong":
            router.push("/manager/dashboard");
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

  return <SupervisorDashboard user={user} onLogout={handleLogout} />;
}
