import { showErrorToast, showSuccessToast } from "@/lib/toast-utils";
import { ApiError, ApiErrorCodes } from "./errors";

interface WithToastOpts<TData = unknown, TVars = unknown, TCtx = unknown> {
  success?: string;
  onSuccess?: (data: TData, vars: TVars, ctx: TCtx) => void | Promise<void>;
  onError?: (error: unknown, vars: TVars, ctx: TCtx) => void | Promise<void>;
}

export function withToast<TData = unknown, TVars = unknown, TCtx = unknown>(
  opts: WithToastOpts<TData, TVars, TCtx>,
) {
  return {
    onSuccess: async (data: TData, vars: TVars, ctx: TCtx) => {
      if (opts.success) {
        showSuccessToast(opts.success);
      }
      if (opts.onSuccess) {
        await opts.onSuccess(data, vars, ctx);
      }
    },
    onError: async (error: unknown, vars: TVars, ctx: TCtx) => {
      if (!(error instanceof ApiError && error.code === ApiErrorCodes.AUTH_EXPIRED)) {
        const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
        showErrorToast(message);
      }
      if (opts.onError) {
        await opts.onError(error, vars, ctx);
      }
    },
  };
}
