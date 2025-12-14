"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ManagerDashboard from "@/components/ManagerDashboard";
import { PageLoading } from "@/components/ui/skeleton-patterns";

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

      if (userData.role !== "truong_phong") {
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

  if (loading) {
    return <PageLoading variant="dashboard" />;
  }

  if (!user) {
    return null;
  }

  return <ManagerDashboard user={user} />;
}
