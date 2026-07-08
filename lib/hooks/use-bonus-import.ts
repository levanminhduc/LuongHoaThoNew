import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import type { BonusImportResult } from "@/lib/bonus/bonus-types";

export function useBonusImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post<BonusImportResult>(ENDPOINTS.bonus.import, formData),
    ...withToast({
      success: "Đã import tiền thưởng",
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["bonus-list"] });
      },
    }),
  });
}
