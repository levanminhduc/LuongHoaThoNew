import {
  formatTimeHHmm,
  normalizeDailyRecords,
  parseNumericValue,
} from "../daily-records";

describe("formatTimeHHmm", () => {
  it("đệm 0 cho giờ một chữ số", () => {
    expect(formatTimeHHmm("7:05")).toBe("07:05");
  });

  it("giữ nguyên giờ hai chữ số và cắt phần giây", () => {
    expect(formatTimeHHmm("17:30:45")).toBe("17:30");
  });

  it("null hoặc rỗng trả chuỗi rỗng", () => {
    expect(formatTimeHHmm(null)).toBe("");
    expect(formatTimeHHmm("")).toBe("");
  });

  it("chuỗi không có dạng giờ thì trả nguyên si", () => {
    expect(formatTimeHHmm("nghỉ phép")).toBe("nghỉ phép");
  });
});

describe("parseNumericValue", () => {
  it("số hợp lệ giữ nguyên", () => {
    expect(parseNumericValue(8)).toBe(8);
    expect(parseNumericValue(0.5)).toBe(0.5);
  });

  it("chuỗi số được ép kiểu", () => {
    expect(parseNumericValue("7.5")).toBe(7.5);
  });

  it("NaN và Infinity thành 0 chứ không lọt vào file Excel", () => {
    expect(parseNumericValue(Number.NaN)).toBe(0);
    expect(parseNumericValue(Number.POSITIVE_INFINITY)).toBe(0);
    expect(parseNumericValue("không phải số")).toBe(0);
  });

  it("null, undefined, chuỗi trắng thành 0", () => {
    expect(parseNumericValue(null)).toBe(0);
    expect(parseNumericValue(undefined)).toBe(0);
    expect(parseNumericValue("   ")).toBe(0);
  });
});

describe("normalizeDailyRecords", () => {
  it("nhận cả quy ước camelCase lẫn snake_case cho cùng một ngày", () => {
    const camel = normalizeDailyRecords([
      {
        day: 3,
        checkIn: "7:00",
        checkOut: "17:00",
        workingUnits: 1,
        overtimeUnits: 2,
      },
    ]);
    const snake = normalizeDailyRecords([
      {
        work_day: 3,
        check_in_time: "7:00",
        check_out_time: "17:00",
        working_units: 1,
        overtime_units: 2,
      },
    ]);

    expect(camel).toEqual(snake);
    expect(camel).toEqual([
      { day: 3, checkIn: "07:00", checkOut: "17:00", working: 1, ot: 2 },
    ]);
  });

  it("nhận chuỗi JSON vì cột daily_records_json có thể là text", () => {
    expect(normalizeDailyRecords('[{"day":1,"workingUnits":1}]')).toEqual([
      { day: 1, checkIn: "", checkOut: "", working: 1, ot: 0 },
    ]);
  });

  it("JSON hỏng trả mảng rỗng thay vì ném", () => {
    expect(normalizeDailyRecords("{khong-phai-json")).toEqual([]);
  });

  it("giá trị không phải mảng trả mảng rỗng", () => {
    expect(normalizeDailyRecords(null)).toEqual([]);
    expect(normalizeDailyRecords(42)).toEqual([]);
    expect(normalizeDailyRecords({ day: 1 })).toEqual([]);
  });

  it("bỏ phần tử có ngày ngoài 1-31 hoặc không đọc được", () => {
    expect(
      normalizeDailyRecords([
        { day: 0 },
        { day: 32 },
        { day: "abc" },
        { day: 1.5 },
        null,
        "chuỗi lạc",
        { day: 15 },
      ]),
    ).toEqual([{ day: 15, checkIn: "", checkOut: "", working: 0, ot: 0 }]);
  });

  it("ngày dạng chuỗi vẫn đọc được", () => {
    expect(normalizeDailyRecords([{ day: "12" }])).toEqual([
      { day: 12, checkIn: "", checkOut: "", working: 0, ot: 0 },
    ]);
  });

  it("giờ không phải chuỗi thì để trống chứ không ép kiểu", () => {
    expect(normalizeDailyRecords([{ day: 5, checkIn: 700 }])).toEqual([
      { day: 5, checkIn: "", checkOut: "", working: 0, ot: 0 },
    ]);
  });

  it("thiếu working/overtime thì về 0, không phải undefined", () => {
    const [record] = normalizeDailyRecords([{ day: 9 }]);
    expect(record.working).toBe(0);
    expect(record.ot).toBe(0);
  });

  it("camelCase được ưu tiên khi có cả hai quy ước", () => {
    expect(
      normalizeDailyRecords([{ day: 2, workingUnits: 1, working_units: 99 }]),
    ).toEqual([{ day: 2, checkIn: "", checkOut: "", working: 1, ot: 0 }]);
  });
});
