/**
 * @jest-environment node
 */
import {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  toErrorResponse,
} from "../app-error";
import { isProduction } from "@/lib/config/runtime";

jest.mock("@/lib/config/runtime", () => ({
  isProduction: jest.fn(),
}));

const isProductionMock = isProduction as jest.MockedFunction<
  typeof isProduction
>;

async function readBody(response: Response) {
  return (await response.json()) as {
    success: boolean;
    error?: { code: string; message: string; details?: string };
    message?: string;
  };
}

describe("AppError", () => {
  it("giu nguyen ten lop de nhan dien khi debug", () => {
    expect(new ValidationError("x").name).toBe("ValidationError");
    expect(new NotFoundError("x").name).toBe("NotFoundError");
  });

  it("moi lop con mang dung status", () => {
    expect(new ValidationError("x").status).toBe(400);
    expect(new UnauthorizedError("x").status).toBe(401);
    expect(new ForbiddenError("x").status).toBe(403);
    expect(new NotFoundError("x").status).toBe(404);
  });

  it("van la Error nen catch cu khong vo", () => {
    expect(new ValidationError("x")).toBeInstanceOf(Error);
    expect(new ValidationError("x")).toBeInstanceOf(AppError);
  });
});

describe("toErrorResponse", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    isProductionMock.mockReturnValue(true);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    isProductionMock.mockReset();
  });

  it("map ValidationError sang 400 kem code cu", async () => {
    const response = toErrorResponse(new ValidationError("Thiếu mã nhân viên"));

    expect(response.status).toBe(400);
    const body = await readBody(response);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
    expect(body.error?.message).toBe("Thiếu mã nhân viên");
  });

  it("map NotFoundError sang 404", async () => {
    const response = toErrorResponse(new NotFoundError("Không tìm thấy"));

    expect(response.status).toBe(404);
    expect((await readBody(response)).error?.code).toBe("EMPLOYEE_NOT_FOUND");
  });

  it("map ForbiddenError sang 403", async () => {
    const response = toErrorResponse(new ForbiddenError("Không có quyền"));

    expect(response.status).toBe(403);
    expect((await readBody(response)).error?.code).toBe("ACCESS_DENIED");
  });

  it("map UnauthorizedError sang 401", async () => {
    const response = toErrorResponse(new UnauthorizedError("Hết phiên"));

    expect(response.status).toBe(401);
    expect((await readBody(response)).error?.code).toBe("UNAUTHORIZED");
  });

  it("loi la thanh 500 va khong lo message goc o production", async () => {
    const response = toErrorResponse(
      new Error("connect ECONNREFUSED 10.0.0.5:5432"),
    );

    expect(response.status).toBe(500);
    const body = await readBody(response);
    expect(body.error?.code).toBe("INTERNAL_ERROR");
    expect(body.error?.message).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
  });

  it("loi la van duoc log day du phia server", () => {
    const error = new Error("boom");

    toErrorResponse(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[API_ERROR]", error);
  });

  it("ngoai production thi giu message goc de debug", async () => {
    isProductionMock.mockReturnValue(false);

    const response = toErrorResponse(new Error("chi tiet noi bo"));

    expect((await readBody(response)).error?.details).toContain(
      "chi tiet noi bo",
    );
  });

  it("nem thu khong phai Error cung khong lam vo", async () => {
    const response = toErrorResponse("chuoi loi tran");

    expect(response.status).toBe(500);
    expect((await readBody(response)).error?.code).toBe("INTERNAL_ERROR");
  });

  it("fallbackMessage thay message chung cho loi la", async () => {
    const response = toErrorResponse(new Error("boom"), {
      fallbackMessage: "Có lỗi xảy ra khi ký nhận lương",
    });

    expect((await readBody(response)).error?.message).toBe(
      "Có lỗi xảy ra khi ký nhận lương",
    );
  });

  it("fallbackMessage khong duoc de len message cua AppError", async () => {
    const response = toErrorResponse(new NotFoundError("Không tìm thấy"), {
      fallbackMessage: "Có lỗi xảy ra khi ký nhận lương",
    });

    expect(response.status).toBe(404);
    expect((await readBody(response)).error?.message).toBe("Không tìm thấy");
  });

  it("headers duoc gan vao ca hai nhanh", () => {
    const sensitive = { "Cache-Control": "no-store" };

    expect(
      toErrorResponse(new Error("boom"), { headers: sensitive }).headers.get(
        "Cache-Control",
      ),
    ).toBe("no-store");
    expect(
      toErrorResponse(new ForbiddenError("Cấm"), {
        headers: sensitive,
      }).headers.get("Cache-Control"),
    ).toBe("no-store");
  });
});
