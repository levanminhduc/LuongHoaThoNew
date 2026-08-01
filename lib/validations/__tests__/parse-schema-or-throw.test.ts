import { parseSchemaOrThrow } from "@/lib/validations/errors";
import { ValidationError } from "@/lib/errors/app-error";
import { EmployeeIdSchema } from "@/lib/validations/common";

describe("parseSchemaOrThrow", () => {
  it("tra ve du lieu da parse khi hop le", () => {
    expect(parseSchemaOrThrow(EmployeeIdSchema, "  NV001 ")).toBe("NV001");
  });

  it("nem ValidationError chu khong phai Error tran", () => {
    expect(() => parseSchemaOrThrow(EmployeeIdSchema, "")).toThrow(
      ValidationError,
    );
  });

  it("van la Error nen catch cu khong vo", () => {
    try {
      parseSchemaOrThrow(EmployeeIdSchema, "");
      throw new Error("dang le phai nem");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Mã nhân viên không được để trống");
    }
  });

  it("loi nem ra mang status 400", () => {
    try {
      parseSchemaOrThrow(EmployeeIdSchema, "");
      throw new Error("dang le phai nem");
    } catch (error) {
      expect((error as ValidationError).status).toBe(400);
    }
  });
});
