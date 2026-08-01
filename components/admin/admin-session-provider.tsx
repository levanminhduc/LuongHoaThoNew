"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth/secure-session";
import { PageLoading } from "@/components/patterns/skeleton-patterns";

export interface AdminSessionUser {
  employee_id?: string;
  username?: string;
  role?: string;
  full_name?: string;
  department?: string;
  allowed_departments?: string[];
  permissions?: string[];
}

interface AdminSessionValue {
  user: AdminSessionUser;
  role: string;
  token: string;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error(
      "useAdminSession phải được dùng bên trong <AdminSessionProvider>",
    );
  }
  return ctx;
}

export function useAdminSessionOptional(): AdminSessionValue | null {
  return useContext(AdminSessionContext);
}

export function AdminSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSessionValue | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await getSession<AdminSessionUser>();

      if (cancelled) return;

      if (!stored?.user) {
        clearSession();
        const redirect = encodeURIComponent(pathname || "/admin/dashboard");
        router.replace(`/admin/login?redirect=${redirect}`);
        setChecked(true);
        return;
      }

      setSession({
        user: stored.user,
        role: stored.user.role || "admin",
        token: stored.token,
      });
      setChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  const value = useMemo(() => session, [session]);

  if (!checked || !value) {
    return <PageLoading variant="dashboard" />;
  }

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}
