import bcrypt from "bcryptjs";
import { legacyVerifyCredential } from "../__fixtures__/legacy-credential-check";
import { verifyEmployeeCredential } from "../employee-credential";
import type { EmployeeCredentialColumns } from "../employee-credential";

const CCCD = "012345678901";
const PASSWORD = "MatKhauMoi123";
const WRONG = "SaiHoanToan999";

let cccdHash: string;
let passwordHash: string;

beforeAll(async () => {
  cccdHash = await bcrypt.hash(CCCD, 4);
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

const employee = (
  overrides: Partial<EmployeeCredentialColumns>,
): EmployeeCredentialColumns => ({
  cccd_hash: null,
  password_hash: null,
  last_password_change_at: null,
  ...overrides,
});

describe("helper mới giữ nguyên hành vi cũ khi cột hash có dữ liệu", () => {
  it.each([
    ["chưa đổi mật khẩu, nhập đúng CCCD", true],
    ["chưa đổi mật khẩu, nhập sai CCCD", false],
  ])("%s", async (_label, expected) => {
    const row = () => employee({ cccd_hash: cccdHash, password_hash: null });
    const input = expected ? CCCD : WRONG;

    const legacy = await legacyVerifyCredential(row(), input);
    const current = await verifyEmployeeCredential(row(), input);

    expect(current).toBe(legacy);
    expect(current).toBe(expected);
  });

  it.each([
    ["đã đổi mật khẩu, nhập đúng mật khẩu mới", true],
    ["đã đổi mật khẩu, nhập sai mật khẩu", false],
  ])("%s", async (_label, expected) => {
    const row = () =>
      employee({
        cccd_hash: cccdHash,
        password_hash: passwordHash,
        last_password_change_at: "2026-07-01 10:00:00",
      });
    const input = expected ? PASSWORD : WRONG;

    const legacy = await legacyVerifyCredential(row(), input);
    const current = await verifyEmployeeCredential(row(), input);

    expect(current).toBe(legacy);
    expect(current).toBe(expected);
  });

  it("đã đổi mật khẩu thì CCCD cũ KHÔNG còn đăng nhập được, cả hai bản đều vậy", async () => {
    const row = () =>
      employee({
        cccd_hash: cccdHash,
        password_hash: passwordHash,
        last_password_change_at: "2026-07-01 10:00:00",
      });

    expect(await legacyVerifyCredential(row(), CCCD)).toBe(false);
    expect(await verifyEmployeeCredential(row(), CCCD)).toBe(false);
  });
});

describe("chỗ hành vi CỐ Ý khác: cột hash rỗng", () => {
  const nullHashCases: [string, Partial<EmployeeCredentialColumns>][] = [
    ["chưa đổi mật khẩu nhưng cccd_hash NULL", { cccd_hash: null }],
    [
      "đã đổi mật khẩu nhưng password_hash NULL",
      { cccd_hash: cccdHash, last_password_change_at: "2026-07-01 10:00:00" },
    ],
    ["cả hai cột hash đều NULL", {}],
  ];

  it.each(nullHashCases)("%s — bản cũ NÉM lỗi", async (_label, overrides) => {
    await expect(
      legacyVerifyCredential(employee(overrides), CCCD),
    ).rejects.toThrow();
  });

  it.each(nullHashCases)(
    "%s — bản mới trả false, không ném",
    async (_label, overrides) => {
      await expect(
        verifyEmployeeCredential(employee(overrides), CCCD),
      ).resolves.toBe(false);
    },
  );
});
