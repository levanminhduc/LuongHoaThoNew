import { pageQuerySchema } from "@/lib/validations/common";

const schema = pageQuerySchema(20);

describe("pageQuerySchema", () => {
  it("dung mac dinh khi khong truyen gi", () => {
    const result = schema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("nhan gia tri dang chuoi tu query string", () => {
    const result = schema.safeParse({ page: "3", limit: "50" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("bo qua null de lay mac dinh", () => {
    const result = schema.safeParse({ page: null, limit: null });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("tu choi page am", () => {
    expect(schema.safeParse({ page: "-5" }).success).toBe(false);
  });

  it("tu choi page bang 0", () => {
    expect(schema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("tu choi page khong phai so", () => {
    expect(schema.safeParse({ page: "abc" }).success).toBe(false);
  });

  it("tu choi page dang thap phan", () => {
    expect(schema.safeParse({ page: "1.5" }).success).toBe(false);
  });

  it("tu choi limit vuot tran", () => {
    expect(schema.safeParse({ limit: "100000" }).success).toBe(false);
  });

  it("cho phep dat tran rieng cho tung route", () => {
    const wide = pageQuerySchema(50, 500);

    expect(wide.safeParse({ limit: "400" }).success).toBe(true);
    expect(wide.safeParse({ limit: "600" }).success).toBe(false);
  });
});
