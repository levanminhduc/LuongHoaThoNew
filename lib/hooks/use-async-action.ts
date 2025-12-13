import { useState, useCallback } from "react";
import {
  showErrorToast,
  showSuccessToast,
  showLoadingToast,
} from "@/lib/toast-utils";
import { toast } from "sonner";

interface UseAsyncActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string | ((data: T) => string);
  errorMessage?: string | ((error: Error) => string);
  showToast?: boolean;
}

export function useAsyncAction<T = void, TArgs extends unknown[] = []>(
  action: (...args: TArgs) => Promise<T>,
  options: UseAsyncActionOptions<T> = {},
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);

      try {
        const result = await action(...args);
        setData(result);

        if (options.showToast !== false && options.successMessage) {
          const message =
            typeof options.successMessage === "function"
              ? options.successMessage(result)
              : options.successMessage;
          showSuccessToast(message);
        }

        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (options.showToast !== false) {
          const message =
            typeof options.errorMessage === "function"
              ? options.errorMessage(error)
              : options.errorMessage || error.message;
          showErrorToast(message);
        }

        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [action, options],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}

interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: Error, variables: TVariables) => string);
  showToast?: boolean;
  showLoadingToast?: boolean;
  loadingMessage?: string;
}

export function useMutation<TData = void, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {},
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setLoading(true);
      setError(null);

      let toastId: string | number | undefined;

      if (options.showLoadingToast && options.loadingMessage) {
        toastId = showLoadingToast(options.loadingMessage);
      }

      try {
        const result = await mutationFn(variables);
        setData(result);

        if (toastId) {
          toast.dismiss(toastId);
        }

        if (options.showToast !== false && options.successMessage) {
          const message =
            typeof options.successMessage === "function"
              ? options.successMessage(result, variables)
              : options.successMessage;
          showSuccessToast(message);
        }

        options.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (toastId) {
          toast.dismiss(toastId);
        }

        if (options.showToast !== false) {
          const message =
            typeof options.errorMessage === "function"
              ? options.errorMessage(error, variables)
              : options.errorMessage || error.message;
          showErrorToast(message);
        }

        options.onError?.(error, variables);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn, options],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    mutate,
    loading,
    error,
    data,
    reset,
    isLoading: loading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
  };
}
