"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

interface NavigationPendingValue {
  pendingHref: string | null;
  isPending: boolean;
  startPending: (href: string) => void;
  clearPending: () => void;
}

const NavigationPendingContext = createContext<NavigationPendingValue>({
  pendingHref: null,
  isPending: false,
  startPending: () => {},
  clearPending: () => {},
});

export function useNavigationPending() {
  return useContext(NavigationPendingContext);
}

export function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (pendingHref && pathname === pendingHref) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  useEffect(() => {
    if (!pendingHref) return;
    const timeout = setTimeout(() => setPendingHref(null), 8_000);
    return () => clearTimeout(timeout);
  }, [pendingHref]);

  const startPending = useCallback((href: string) => {
    setPendingHref((current) => (current === href ? current : href));
  }, []);

  const clearPending = useCallback(() => setPendingHref(null), []);

  const value = useMemo<NavigationPendingValue>(
    () => ({
      pendingHref,
      isPending: pendingHref !== null,
      startPending,
      clearPending,
    }),
    [pendingHref, startPending, clearPending],
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}
