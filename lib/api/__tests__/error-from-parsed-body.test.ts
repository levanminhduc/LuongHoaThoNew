import { errorFromParsedBody } from "../client";

function responseWith(status: number) {
  return { status } as Response;
}

describe("errorFromParsedBody", () => {
  it("doc error dang chuoi nhu cu", () => {
    const err = errorFromParsedBody(responseWith(400), {
      error: "Thiếu mã nhân viên",
    });

    expect(err.message).toBe("Thiếu mã nhân viên");
  });

  it("doc error dang object cua createValidationErrorResponse", () => {
    const err = errorFromParsedBody(responseWith(400), {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Số CCCD phải có đúng 12 chữ số",
        field: "new_cccd",
        timestamp: "2026-08-01 19:00:00",
      },
      message: "Số CCCD phải có đúng 12 chữ số",
    });

    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Số CCCD phải có đúng 12 chữ số");
  });

  it("doc loi dau tien khi tra ve nhieu loi", () => {
    const err = errorFromParsedBody(responseWith(400), {
      success: false,
      errors: [
        {
          code: "VALIDATION_ERROR",
          message: "Mã nhân viên không được để trống",
        },
        { code: "VALIDATION_ERROR", message: "Số CCCD phải có đúng 12 chữ số" },
      ],
      message: "2 lỗi xác thực",
    });

    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Mã nhân viên không được để trống");
    expect(err.details).toHaveLength(2);
  });

  it("dung message khi khong co error", () => {
    const err = errorFromParsedBody(responseWith(500), {
      message: "Lỗi hệ thống nội bộ",
    });

    expect(err.message).toBe("Lỗi hệ thống nội bộ");
  });

  it("fallback theo status khi body khong doc duoc", () => {
    const err = errorFromParsedBody(responseWith(503), null);

    expect(err.message).toBe("Lỗi 503");
  });

  it("khong bao gio tra message la object", () => {
    const err = errorFromParsedBody(responseWith(400), {
      error: { code: "X", message: "thong bao that" },
    });

    expect(typeof err.message).toBe("string");
    expect(err.message).not.toContain("[object");
  });
});
