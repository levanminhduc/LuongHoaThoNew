"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ADMIN_ROUTES = [
  "/admin/dashboard",
  "/admin/employee-management",
  "/admin/payroll-management",
  "/admin/payroll-import-export",
  "/admin/data-validation",
  "/admin/bulk-signature",
  "/admin/dashboard/update-cccd",
  "/admin/column-mapping-config",
  "/admin/department-management",
];

export function AdminPrefetch() {
  const router = useRouter();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (hasPrefetched.current) return;

    const timer = setTimeout(() => {
      ADMIN_ROUTES.forEach((route) => {
        router.prefetch(route);
      });
      hasPrefetched.current = true;
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
