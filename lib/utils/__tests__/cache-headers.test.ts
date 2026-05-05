import { CACHE_HEADERS } from "../cache-headers";

describe("CACHE_HEADERS", () => {
  it("sensitive: no-store private", () => {
    expect(CACHE_HEADERS.sensitive["Cache-Control"]).toBe(
      "private, no-store, max-age=0"
    );
  });
  it("shortPrivate: 60s private", () => {
    expect(CACHE_HEADERS.shortPrivate["Cache-Control"]).toBe(
      "private, max-age=60"
    );
  });
  it("static: 5 phut public", () => {
    expect(CACHE_HEADERS.static["Cache-Control"]).toBe("public, max-age=300");
  });
});
