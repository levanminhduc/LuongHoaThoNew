"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth/secure-session";
import ManagerDashboard from "@/components/ManagerDashboard";
import { PageLoading } from "@/components/patterns/skeleton-patterns";

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

  const checkAuthentication = async () => {
    try {
      const session = await getSession<User>();

      if (!session?.user) {
        router.push("/admin/login");
        return;
      }

      const userData = session.user;

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
      clearSession();
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
