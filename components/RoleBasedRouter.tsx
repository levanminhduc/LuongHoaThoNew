"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/app/admin/dashboard/page";
import DirectorDashboard from "@/app/director/dashboard/page";
import AccountantDashboard from "@/app/accountant/dashboard/page";
import ReporterDashboard from "@/app/reporter/dashboard/page";
import ManagerDashboard from "@/components/ManagerDashboard";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import LoginPage from "@/app/admin/login/page";

interface User {
  employee_id: string;
  username: string;
  role:
    | "admin"
    | "giam_doc"
    | "ke_toan"
    | "nguoi_lap_bieu"
    | "truong_phong"
    | "to_truong"
    | "nhan_vien"
    | "van_phong";
  department: string;
  allowed_departments?: string[];
  permissions: string[];
}

interface RoleBasedRouterProps {
  initialPath?: string;
}

export default function RoleBasedRouter({ initialPath }: RoleBasedRouterProps) {
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
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userStr);
      setUser(userData);

      // Redirect based on role and initial path
      if (initialPath) {
        handleRoleBasedRedirect(userData.role, initialPath);
      }
    } catch (error) {
      console.error("Authentication check error:", error);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("user_info");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleBasedRedirect = (role: string, path: string) => {
    // Define role-based access rules
    const accessRules = {
      admin: [
        "/admin",
        "/admin/dashboard",
        "/admin/payroll-management",
        "/admin/employee-management",
        "/admin/payroll-import-export",
      ],
      giam_doc: [
        "/director",
        "/director/dashboard",
        "/director/reports",
        "/director/financial",
        "/director/departments",
      ],
      ke_toan: [
        "/accountant",
        "/accountant/dashboard",
        "/accountant/payroll",
        "/accountant/financial",
        "/accountant/reports",
      ],
      nguoi_lap_bieu: [
        "/reporter",
        "/reporter/dashboard",
        "/reporter/reports",
        "/reporter/data-entry",
      ],
      truong_phong: [
        "/manager",
        "/manager/dashboard",
        "/manager/payroll-view",
        "/manager/reports",
      ],
      to_truong: [
        "/supervisor",
        "/supervisor/dashboard",
        "/supervisor/payroll-view",
      ],
      nhan_vien: ["/employee", "/employee/dashboard", "/employee/payroll-view"],
    };

    const allowedPaths = accessRules[role as keyof typeof accessRules] || [];

    // Check if current path is allowed for this role
    const isPathAllowed = allowedPaths.some((allowedPath) =>
      path.startsWith(allowedPath),
    );

    if (!isPathAllowed) {
      // Redirect to appropriate dashboard
      switch (role) {
        case "admin":
          router.push("/admin/dashboard");
          break;
        case "giam_doc":
          router.push("/director/dashboard");
          break;
        case "ke_toan":
          router.push("/accountant/dashboard");
          break;
        case "nguoi_lap_bieu":
          router.push("/reporter/dashboard");
          break;
        case "truong_phong":
          router.push("/manager/dashboard");
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
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_info");
    setUser(null);
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Render appropriate dashboard based on role
  switch (user.role) {
    case "admin":
      return <AdminDashboard />;

    case "giam_doc":
      return <DirectorDashboard />;

    case "ke_toan":
      return <AccountantDashboard />;

    case "nguoi_lap_bieu":
      return <ReporterDashboard />;

    case "truong_phong":
      return <ManagerDashboard user={user} onLogout={handleLogout} />;

    case "to_truong":
      return <SupervisorDashboard user={user} onLogout={handleLogout} />;

    case "nhan_vien":
      return <EmployeeDashboard user={user} onLogout={handleLogout} />;

    default:
      return <LoginPage />;
  }
}

// Hook for role-based access control in components
export function useRoleAccess() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user_info");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, []);

  const hasRole = (role: string) => user?.role === role;
  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.permissions.includes("ALL")) return true;
    return user.permissions.includes(permission);
  };
  const canAccessDepartment = (department: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "giam_doc") return true;
    if (user.role === "ke_toan") return true;
    if (user.role === "nguoi_lap_bieu") return true;
    if (user.role === "truong_phong") {
      return user.allowed_departments?.includes(department) || false;
    }
    if (user.role === "to_truong") {
      return user.department === department;
    }
    return false;
  };

  return {
    user,
    hasRole,
    hasPermission,
    canAccessDepartment,
    isAdmin: () => hasRole("admin"),
    isDirector: () => hasRole("giam_doc"),
    isAccountant: () => hasRole("ke_toan"),
    isReporter: () => hasRole("nguoi_lap_bieu"),
    isManager: () => hasRole("truong_phong"),
    isSupervisor: () => hasRole("to_truong"),
    isEmployee: () => hasRole("nhan_vien"),
  };
}

// Higher-order component for protecting routes
export function withRoleProtection(
  WrappedComponent: React.ComponentType<Record<string, unknown>>,
  allowedRoles: string[],
) {
  return function ProtectedComponent(props: Record<string, unknown>) {
    const { user, hasRole } = useRoleAccess();
    const router = useRouter();

    useEffect(() => {
      if (user && !allowedRoles.some((role) => hasRole(role))) {
        // Redirect to appropriate dashboard if access denied
        switch (user.role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "giam_doc":
            router.push("/director/dashboard");
            break;
          case "ke_toan":
            router.push("/accountant/dashboard");
            break;
          case "nguoi_lap_bieu":
            router.push("/reporter/dashboard");
            break;
          case "truong_phong":
            router.push("/manager/dashboard");
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
      }
    }, [user, router]);

    if (!user) {
      return <LoginPage />;
    }

    if (!allowedRoles.some((role) => hasRole(role))) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Không có quyền truy cập
            </h1>
            <p className="text-gray-600">
              Bạn không có quyền truy cập trang này.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} user={user} />;
  };
}
