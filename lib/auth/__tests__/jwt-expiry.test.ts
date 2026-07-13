import { decodeJwtExp, isJwtExpired } from "../jwt-expiry";

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${body}.fake-signature`;
}

describe("decodeJwtExp", () => {
  it("returns exp from a valid JWT payload", () => {
    const token = makeToken({ username: "user1", exp: 1750000000 });
    expect(decodeJwtExp(token)).toBe(1750000000);
  });

  it("returns null when payload has no exp", () => {
    const token = makeToken({ username: "user1" });
    expect(decodeJwtExp(token)).toBeNull();
  });

  it("returns null for a non-JWT string", () => {
    expect(decodeJwtExp("not-a-jwt")).toBeNull();
  });

  it("returns null for a malformed payload segment", () => {
    expect(decodeJwtExp("aaa.%%%.ccc")).toBeNull();
  });

  it("decodes exp when payload contains non-ASCII characters", () => {
    const utf8Payload = new TextEncoder().encode(
      JSON.stringify({ username: "Trưởng Phòng May", exp: 1750000000 }),
    );
    let binary = "";
    utf8Payload.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const body = btoa(binary).replace(/=+$/, "");
    const token = `${btoa("{}")}.${body}.sig`;
    expect(decodeJwtExp(token)).toBe(1750000000);
  });
});

describe("isJwtExpired", () => {
  it("returns true when exp is in the past", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isJwtExpired(makeToken({ exp: past }))).toBe(true);
  });

  it("returns false when exp is in the future", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isJwtExpired(makeToken({ exp: future }))).toBe(false);
  });

  it("returns false when exp cannot be determined", () => {
    expect(isJwtExpired("opaque-token")).toBe(false);
  });
});
