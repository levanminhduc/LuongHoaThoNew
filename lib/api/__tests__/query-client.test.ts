import { ApiError } from "../errors";
import { createQueryClient } from "../query-client";

type RetryFn = (failureCount: number, error: unknown) => boolean;

describe("createQueryClient", () => {
  it("does not retry on 4xx ApiError", () => {
    const queryClient = createQueryClient();
    const retryFn = queryClient.getDefaultOptions().queries?.retry as RetryFn;
    const error = new ApiError("VALIDATION_ERROR", "x", 400);

    expect(retryFn(0, error)).toBe(false);
  });

  it("retries once on 5xx ApiError", () => {
    const queryClient = createQueryClient();
    const retryFn = queryClient.getDefaultOptions().queries?.retry as RetryFn;
    const error = new ApiError("SERVER_ERROR", "x", 500);

    expect(retryFn(0, error)).toBe(true);
    expect(retryFn(1, error)).toBe(false);
  });

  it("mutations do not retry", () => {
    const queryClient = createQueryClient();

    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
