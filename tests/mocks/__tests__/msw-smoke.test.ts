/**
 * @jest-environment node
 */
import { http, HttpResponse } from "msw";
import { server } from "../enable-msw";

describe("MSW smoke", () => {
  it("replaces jest mock fetch with a real implementation", () => {
    expect(
      (globalThis.fetch as typeof fetch & { _isMockFunction?: boolean })
        ._isMockFunction,
    ).toBeFalsy();
    expect(typeof globalThis.fetch).toBe("function");
  });

  it("MSW intercepts a registered handler end-to-end", async () => {
    server.use(
      http.get("http://localhost/__msw_proof", () =>
        HttpResponse.json({ intercepted: true }),
      ),
    );

    const response = await fetch("http://localhost/__msw_proof");
    expect(await response.json()).toEqual({ intercepted: true });
  });

  it("localStorage is stateful", () => {
    globalThis.localStorage.setItem("foo", "bar");
    expect(globalThis.localStorage.getItem("foo")).toBe("bar");
    globalThis.localStorage.removeItem("foo");
    expect(globalThis.localStorage.getItem("foo")).toBeNull();
  });
});
