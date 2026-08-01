import {
  getVietnamDate,
  getVietnamMonth,
  getVietnamMonthsAgo,
  getVietnamYear,
} from "../vietnam-timezone";

const AT_UTC = (iso: string) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(iso));
};

describe("vietnam-timezone: mặc định tháng/năm", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("trả đúng định dạng YYYY-MM-DD / YYYY-MM", () => {
    AT_UTC("2026-08-01T05:00:00Z");
    expect(getVietnamDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getVietnamMonth()).toMatch(/^\d{4}-\d{2}$/);
  });

  it("đầu tháng lúc 00:30 giờ Việt Nam vẫn là tháng mới, dù UTC còn ở tháng cũ", () => {
    AT_UTC("2026-07-31T17:30:00Z");
    expect(new Date().toISOString().slice(0, 7)).toBe("2026-07");
    expect(getVietnamMonth()).toBe("2026-08");
    expect(getVietnamDate()).toBe("2026-08-01");
  });

  it("đầu năm lúc 06:00 giờ Việt Nam vẫn là năm mới, dù UTC còn ở năm cũ", () => {
    AT_UTC("2025-12-31T23:00:00Z");
    expect(new Date().getUTCFullYear()).toBe(2025);
    expect(getVietnamYear()).toBe(2026);
    expect(getVietnamMonth()).toBe("2026-01");
  });

  it("cuối tháng lúc 23:30 giờ Việt Nam vẫn là tháng cũ, dù UTC đã sang tháng mới", () => {
    AT_UTC("2026-08-31T16:30:00Z");
    expect(getVietnamMonth()).toBe("2026-08");
    expect(getVietnamDate()).toBe("2026-08-31");
  });

  it("giữa ngày thì Việt Nam và UTC trùng tháng", () => {
    AT_UTC("2026-08-15T03:00:00Z");
    expect(getVietnamMonth()).toBe(new Date().toISOString().slice(0, 7));
    expect(getVietnamYear()).toBe(2026);
  });
});

describe("getVietnamMonthsAgo", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("lùi trong cùng năm", () => {
    AT_UTC("2026-08-15T03:00:00Z");
    expect(getVietnamMonthsAgo(1)).toBe("2026-07");
    expect(getVietnamMonthsAgo(6)).toBe("2026-02");
  });

  it("lùi qua ranh giới năm", () => {
    AT_UTC("2026-03-15T03:00:00Z");
    expect(getVietnamMonthsAgo(6)).toBe("2025-09");
    expect(getVietnamMonthsAgo(3)).toBe("2025-12");
    expect(getVietnamMonthsAgo(15)).toBe("2024-12");
  });

  it("lùi 0 tháng là chính tháng hiện tại", () => {
    AT_UTC("2026-01-10T03:00:00Z");
    expect(getVietnamMonthsAgo(0)).toBe(getVietnamMonth());
  });

  it("ngày 31 không bị nhảy tháng như setMonth() của Date", () => {
    AT_UTC("2026-08-31T03:00:00Z");
    expect(getVietnamMonthsAgo(6)).toBe("2026-02");
  });
});
