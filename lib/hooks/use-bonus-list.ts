import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import type { BonusType } from "@/lib/validations/bonus";
import type {
  BonusListResponse,
  BonusPeriodsResponse,
} from "@/lib/bonus/bonus-types";

export function useBonusPeriodsQuery(department?: string) {
  return useQuery({
    queryKey: ["bonus-periods", department ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (department) params.set("department", department);
      const query = params.toString();
      return apiClient.get<BonusPeriodsResponse>(
        query ? `${ENDPOINTS.bonus.periods}?${query}` : ENDPOINTS.bonus.periods,
      );
    },
  });
}

export function useBonusListQuery(params: {
  bonusType: BonusType | null;
  bonusPeriod: string | null;
  department?: string;
}) {
  const { bonusType, bonusPeriod, department } = params;
  return useQuery({
    queryKey: ["bonus-list", bonusType, bonusPeriod, department ?? "all"],
    enabled: bonusType !== null && bonusPeriod !== null,
    queryFn: () => {
      const search = new URLSearchParams({
        bonus_type: bonusType as string,
        bonus_period: bonusPeriod as string,
      });
      if (department) search.set("department", department);
      return apiClient.get<BonusListResponse>(
        `${ENDPOINTS.bonus.list}?${search.toString()}`,
      );
    },
  });
}

export function useDeleteBonusPeriodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target: { bonusType: BonusType; bonusPeriod: string }) => {
      const search = new URLSearchParams({
        bonus_type: target.bonusType,
        bonus_period: target.bonusPeriod,
      });
      return apiClient.delete(`${ENDPOINTS.bonus.adminDelete}?${search}`);
    },
    ...withToast({
      success: "Đã xóa đợt thưởng",
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["bonus-list"] });
        queryClient.invalidateQueries({ queryKey: ["bonus-periods"] });
      },
    }),
  });
}
