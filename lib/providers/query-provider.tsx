"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { usePathname, useRouter } from "next/navigation";
import { resolveLoginPath } from "@/lib/api/auth-redirect";
import { setOnAuthExpired } from "@/lib/api/client";
import { createQueryClient } from "@/lib/api/query-client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef(createQueryClient());
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setOnAuthExpired(() => {
      void clientRef.current.cancelQueries();
      clientRef.current.clear();
      router.push(resolveLoginPath(pathname));
    });

    return () => setOnAuthExpired(null);
  }, [router, pathname]);

  return (
    <QueryClientProvider client={clientRef.current}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      ) : null}
    </QueryClientProvider>
  );
}
