"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient, clearAuthStorage } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

export function useLogout(redirectPath = "/admin/login") {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    try {
      await apiClient.post(ENDPOINTS.auth.logout, {});
    } catch (error) {
      void error;
    }

    await queryClient.cancelQueries();
    queryClient.clear();
    clearAuthStorage();
    router.push(redirectPath);
  };
}
