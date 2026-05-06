/**
 * @jest-environment node
 */
import { http, HttpResponse } from "msw";
import { apiClient, setOnAuthExpired } from "../client";
import { server } from "tests/mocks/enable-msw";

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    setOnAuthExpired(null);
  });

  it("attaches Bearer token from localStorage admin_token", async () => {
    localStorage.setItem("admin_token", "tok-123");
    let capturedAuth = "";

    server.use(
      http.get("*/api/admin/test", ({ request }) => {
        capturedAuth = request.headers.get("Authorization") ?? "";
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get("http://localhost/api/admin/test");

    expect(capturedAuth).toBe("Bearer tok-123");
  });

  it("returns parsed JSON on 200", async () => {
    server.use(http.get("*/api/x", () => HttpResponse.json({ data: [1, 2] })));

    const result = await apiClient.get<{ data: number[] }>(
      "http://localhost/api/x",
    );

    expect(result.data).toEqual([1, 2]);
  });

  it("throws ApiError(AUTH_EXPIRED) on 401 and clears auth keys", async () => {
    localStorage.setItem("admin_token", "tok");
    localStorage.setItem("auth_token", "tok2");
    localStorage.setItem("user_info", '{"id":"X"}');
    localStorage.setItem("admin_user", '{"id":"Y"}');
    localStorage.setItem("employee_user", '{"id":"Z"}');

    server.use(
      http.get("*/api/x", () =>
        HttpResponse.json(
          { error: "expired", code: "AUTH_EXPIRED" },
          { status: 401 },
        ),
      ),
    );

    const handler = jest.fn();
    setOnAuthExpired(handler);

    await expect(apiClient.get("http://localhost/api/x")).rejects.toMatchObject({
      code: "AUTH_EXPIRED",
      status: 401,
    });
    expect(localStorage.getItem("admin_token")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("user_info")).toBeNull();
    expect(localStorage.getItem("admin_user")).toBeNull();
    expect(localStorage.getItem("employee_user")).toBeNull();
    expect(handler).toHaveBeenCalled();
  });

  it("throws ApiError with code from body on 400", async () => {
    server.use(
      http.post("*/api/x", () =>
        HttpResponse.json(
          {
            error: "Sai input",
            code: "VALIDATION_ERROR",
            details: [{ field: "x" }],
          },
          { status: 400 },
        ),
      ),
    );

    await expect(
      apiClient.post("http://localhost/api/x", { y: 1 }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      details: [{ field: "x" }],
    });
  });

  it("throws ApiError(NETWORK_ERROR) on fetch reject", async () => {
    server.use(http.get("*/api/x", () => HttpResponse.error()));

    await expect(apiClient.get("http://localhost/api/x")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("forwards AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    const promise = apiClient.get("http://localhost/api/x", {
      signal: controller.signal,
    });

    await expect(promise).rejects.toThrow();
  });

  it("apiClient.blob returns Blob and Content-Disposition filename", async () => {
    server.use(
      http.get("*/api/admin/export", () =>
        new HttpResponse(new Blob([new Uint8Array([1, 2, 3])]), {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="bao-cao.xlsx"' },
        }),
      ),
    );

    const result = await apiClient.blob("http://localhost/api/admin/export");

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.filename).toBe("bao-cao.xlsx");
  });

  it("apiClient.blob throws ApiError on 4xx JSON body", async () => {
    server.use(
      http.get("*/api/admin/export", () =>
        HttpResponse.json(
          { error: "Sai input", code: "VALIDATION_ERROR" },
          { status: 400 },
        ),
      ),
    );

    await expect(
      apiClient.blob("http://localhost/api/admin/export"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });
});
