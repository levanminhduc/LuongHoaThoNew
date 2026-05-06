import { showErrorToast, showSuccessToast } from "@/lib/toast-utils";
import { ApiError } from "../errors";
import { withToast } from "../mutation-helpers";

jest.mock("@/lib/toast-utils", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

describe("withToast", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls showSuccessToast onSuccess with provided message", async () => {
    const opts = withToast({ success: "Đã ký" });

    await opts.onSuccess(undefined as never, undefined as never, undefined as never);

    expect(showSuccessToast).toHaveBeenCalledWith("Đã ký");
  });

  it("calls showErrorToast onError with ApiError message", async () => {
    const opts = withToast({});

    await opts.onError(
      new ApiError("VALIDATION_ERROR", "Sai input", 400),
      undefined as never,
      undefined as never,
    );

    expect(showErrorToast).toHaveBeenCalledWith("Sai input");
  });

  it("does not toast on AUTH_EXPIRED", async () => {
    const opts = withToast({});

    await opts.onError(
      new ApiError("AUTH_EXPIRED", "expired", 401),
      undefined as never,
      undefined as never,
    );

    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it("preserves user onSuccess", async () => {
    const userOnSuccess = jest.fn();
    const opts = withToast({ success: "OK", onSuccess: userOnSuccess });

    await opts.onSuccess({ id: 1 }, {}, undefined);

    expect(showSuccessToast).toHaveBeenCalledWith("OK");
    expect(userOnSuccess).toHaveBeenCalledWith({ id: 1 }, {}, undefined);
  });

  it("preserves user onError", async () => {
    const userOnError = jest.fn();
    const opts = withToast({ onError: userOnError });
    const error = new ApiError("VALIDATION_ERROR", "Sai input", 400);

    await opts.onError(error, {}, undefined);

    expect(showErrorToast).toHaveBeenCalledWith("Sai input");
    expect(userOnError).toHaveBeenCalledWith(error, {}, undefined);
  });
});
