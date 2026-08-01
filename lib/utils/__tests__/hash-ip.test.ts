import { hashClientIp } from "../hash-ip";

describe("hashClientIp", () => {
  it("tra ve chuoi hex 16 ky tu", () => {
    expect(hashClientIp("1.2.3.4", "salt-du-dai-16-ky-tu")).toMatch(
      /^[0-9a-f]{16}$/,
    );
  });

  it("cung ip cung salt cho cung ket qua", () => {
    const salt = "salt-du-dai-16-ky-tu";

    expect(hashClientIp("1.2.3.4", salt)).toBe(hashClientIp("1.2.3.4", salt));
  });

  it("doi salt thi hash phai doi", () => {
    const first = hashClientIp("1.2.3.4", "salt-du-dai-16-ky-tu");
    const second = hashClientIp("1.2.3.4", "salt-khac-du-dai-16");

    expect(first).not.toBe(second);
  });

  it("salt rong cho ket qua khac salt that", () => {
    expect(hashClientIp("1.2.3.4", "")).not.toBe(
      hashClientIp("1.2.3.4", "salt-du-dai-16-ky-tu"),
    );
  });

  it("ip khac nhau cho hash khac nhau", () => {
    const salt = "salt-du-dai-16-ky-tu";

    expect(hashClientIp("1.2.3.4", salt)).not.toBe(
      hashClientIp("5.6.7.8", salt),
    );
  });
});
