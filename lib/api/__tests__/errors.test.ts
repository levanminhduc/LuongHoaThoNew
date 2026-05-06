import { ApiError, isApiError } from "../errors";

describe("ApiError", () => {
  it("stores code, message, status, details", () => {
    const err = new ApiError("VALIDATION_ERROR", "Sai input", 400, [
      { field: "name" },
    ]);

    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Sai input");
    expect(err.status).toBe(400);
    expect(err.details).toEqual([{ field: "name" }]);
    expect(err).toBeInstanceOf(Error);
  });

  it("isApiError type guard returns true for ApiError", () => {
    expect(isApiError(new ApiError("X", "Y", 500))).toBe(true);
    expect(isApiError(new Error("plain"))).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});
