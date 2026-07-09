"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth/secure-session";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import { useLogout } from "@/lib/hooks/use-logout";

interface User {
  employee_id: string;
  username: string;
  role: string;
  department: string;
  permissions: string[];
}

export default function EmployeeDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const logout = useLogout("/");

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

      if (userData.role !== "nhan_vien") {
        // Redirect based on actual role
        switch (userData.role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "truong_phong":
            router.push("/manager/dashboard");
            break;
          case "to_truong":
            router.push("/supervisor/dashboard");
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return <EmployeeDashboard user={user} onLogout={logout} />;
}
