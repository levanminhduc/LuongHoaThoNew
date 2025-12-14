"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import { PageLoading } from "@/components/ui/skeleton-patterns";

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

      if (userData.role !== "to_truong") {
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

  if (loading) {
    return <PageLoading variant="dashboard" />;
  }

  if (!user) {
    return null;
  }

  return <SupervisorDashboard user={user} />;
}
