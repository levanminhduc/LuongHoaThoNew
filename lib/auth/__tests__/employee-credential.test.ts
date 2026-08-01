import bcrypt from "bcryptjs";
import {
  hasChangedPassword,
  selectCredentialHash,
  verifyEmployeeCredential,
} from "../employee-credential";

const CCCD_HASH = bcrypt.hashSync("012345678901", 4);
const PASSWORD_HASH = bcrypt.hashSync("matkhaumoi", 4);

describe("hasChangedPassword", () => {
  it("trả false khi last_password_change_at là null", () => {
    expect(hasChangedPassword({ last_password_change_at: null })).toBe(false);
  });

  it("trả true khi đã từng đổi mật khẩu", () => {
    expect(
      hasChangedPassword({ last_password_change_at: "2026-01-01T00:00:00Z" }),
    ).toBe(true);
  });
});

describe("selectCredentialHash", () => {
  it("dùng cccd_hash khi chưa đổi mật khẩu", () => {
    expect(
      selectCredentialHash({
        cccd_hash: CCCD_HASH,
        password_hash: PASSWORD_HASH,
        last_password_change_at: null,
      }),
    ).toBe(CCCD_HASH);
  });

  it("dùng password_hash khi đã đổi mật khẩu", () => {
    expect(
      selectCredentialHash({
        cccd_hash: CCCD_HASH,
        password_hash: PASSWORD_HASH,
        last_password_change_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe(PASSWORD_HASH);
  });
});

describe("verifyEmployeeCredential", () => {
  it("xác thực bằng CCCD khi chưa đổi mật khẩu", async () => {
    await expect(
      verifyEmployeeCredential(
        {
          cccd_hash: CCCD_HASH,
          password_hash: null,
          last_password_change_at: null,
        },
        "012345678901",
      ),
    ).resolves.toBe(true);
  });

  it("xác thực bằng mật khẩu khi đã đổi mật khẩu", async () => {
    await expect(
      verifyEmployeeCredential(
        {
          cccd_hash: CCCD_HASH,
          password_hash: PASSWORD_HASH,
          last_password_change_at: "2026-01-01T00:00:00Z",
        },
        "matkhaumoi",
      ),
    ).resolves.toBe(true);
  });

  it("trả false khi sai mật khẩu", async () => {
    await expect(
      verifyEmployeeCredential(
        {
          cccd_hash: CCCD_HASH,
          password_hash: null,
          last_password_change_at: null,
        },
        "999999999999",
      ),
    ).resolves.toBe(false);
  });

  it("trả false thay vì ném lỗi khi password_hash là null", async () => {
    await expect(
      verifyEmployeeCredential(
        {
          cccd_hash: CCCD_HASH,
          password_hash: null,
          last_password_change_at: "2026-01-01T00:00:00Z",
        },
        "matkhaumoi",
      ),
    ).resolves.toBe(false);
  });

  it("trả false thay vì ném lỗi khi cccd_hash là null", async () => {
    await expect(
      verifyEmployeeCredential(
        {
          cccd_hash: null,
          password_hash: null,
          last_password_change_at: null,
        },
        "012345678901",
      ),
    ).resolves.toBe(false);
  });
});
