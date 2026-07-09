"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth/secure-session";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import { PageLoading } from "@/components/patterns/skeleton-patterns";

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

  const checkAuthentication = async () => {
    try {
      const session = await getSession<User>();

      if (!session?.user) {
        router.push("/admin/login");
        return;
      }

      const userData = session.user;

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

  return <SupervisorDashboard user={user} />;
}
