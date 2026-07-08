import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import type {
  BonusType,
  BonusManagementSignatureRequest,
} from "@/lib/validations/bonus";
import type {
  BonusManagementSignatureStatus,
  BonusManagementSignatureSuccess,
} from "@/lib/bonus/bonus-types";

export function bonusSignatureStatusKey(
  bonusType: BonusType | null,
  bonusPeriod: string | null,
) {
  return ["bonus-signature-status", bonusType, bonusPeriod] as const;
}

export function useBonusSignatureStatusQuery(params: {
  bonusType: BonusType | null;
  bonusPeriod: string | null;
}) {
  const { bonusType, bonusPeriod } = params;
  return useQuery({
    queryKey: bonusSignatureStatusKey(bonusType, bonusPeriod),
    enabled: bonusType !== null && bonusPeriod !== null,
    queryFn: () => {
      const search = new URLSearchParams({
        bonus_type: bonusType as string,
        bonus_period: bonusPeriod as string,
      });
      return apiClient.get<BonusManagementSignatureStatus>(
        `${ENDPOINTS.bonus.managementSignature}?${search.toString()}`,
      );
    },
    staleTime: 30_000,
  });
}

export function useBonusManagementSignatureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BonusManagementSignatureRequest) =>
      apiClient.post<BonusManagementSignatureSuccess>(
        ENDPOINTS.bonus.managementSignature,
        input,
      ),
    ...withToast({
      success: "Đã ký duyệt đợt thưởng",
      onSuccess: (_data, vars) => {
        queryClient.invalidateQueries({
          queryKey: bonusSignatureStatusKey(vars.bonus_type, vars.bonus_period),
        });
      },
    }),
  });
}
