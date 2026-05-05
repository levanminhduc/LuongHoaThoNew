import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../security";

describe("Security Constants", () => {
  it("BCRYPT_ROUNDS should be 12", () => {
    expect(BCRYPT_ROUNDS).toBe(12);
  });

  it("hash dung BCRYPT_ROUNDS verify duoc", async () => {
    const password = "TestPass123";
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const ok = await bcrypt.compare(password, hash);
    expect(ok).toBe(true);
  });

  it("compare hash cu rounds=10 van pass (backward compat)", async () => {
    const password = "TestPass123";
    const oldHash = await bcrypt.hash(password, 10);
    const ok = await bcrypt.compare(password, oldHash);
    expect(ok).toBe(true);
  });
});
