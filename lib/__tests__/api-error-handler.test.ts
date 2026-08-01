import { ApiErrorHandler } from "../api-error-handler";
import { isProduction } from "../config/runtime";

jest.mock("../config/runtime", () => ({
  isProduction: jest.fn(),
}));

const isProductionMock = isProduction as jest.MockedFunction<
  typeof isProduction
>;

describe("ApiErrorHandler.fromError", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    isProductionMock.mockReset();
  });

  it("khong dua stack trace vao response o production", () => {
    isProductionMock.mockReturnValue(true);

    const apiError = ApiErrorHandler.fromError(new Error("boom"));

    expect(apiError.details).toBeUndefined();
  });

  it("khong dua chi tiet loi la vao response o production", () => {
    isProductionMock.mockReturnValue(true);

    const apiError = ApiErrorHandler.fromError({ token: "secret-value" });

    expect(apiError.details).toBeUndefined();
    expect(apiError.message).toBe("Unknown error occurred");
  });

  it("giu stack trace ngoai production de debug", () => {
    isProductionMock.mockReturnValue(false);

    const apiError = ApiErrorHandler.fromError(new Error("boom"));

    expect(apiError.details).toContain("Error: boom");
  });

  it("luon log loi day du phia server", () => {
    isProductionMock.mockReturnValue(true);
    const error = new Error("boom");

    ApiErrorHandler.fromError(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[API_ERROR]", error);
  });

  it("giu nguyen code message va timestamp", () => {
    isProductionMock.mockReturnValue(true);

    const apiError = ApiErrorHandler.fromError(
      new Error("boom"),
      ApiErrorHandler.ErrorCodes.DATABASE_ERROR,
    );

    expect(apiError.code).toBe("DATABASE_ERROR");
    expect(apiError.message).toBe("boom");
    expect(apiError.timestamp).toBeTruthy();
  });

  it("khong lam lo stack qua createErrorResponse o production", () => {
    isProductionMock.mockReturnValue(true);

    const apiError = ApiErrorHandler.fromError(new Error("boom"));
    const response = ApiErrorHandler.createErrorResponse(apiError);

    expect(JSON.stringify(response)).not.toContain("api-error-handler");
  });
});
