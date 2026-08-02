import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import {
  legacyInsertEmployeeSecurityEvent,
  legacyInsertSecurityLog,
  legacyPasswordResetHistoryQuery,
  type LegacyPasswordResetHistoryFilters,
} from "../__fixtures__/legacy-security-log-queries";
import {
  buildPasswordResetHistoryQuery,
  insertEmployeeSecurityEvent,
  insertSecurityLog,
  type SupabaseServiceClient,
} from "../audit-log-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

const NO_FILTERS: LegacyPasswordResetHistoryFilters = {
  employeeCode: null,
  status: null,
  startDate: null,
  endDate: null,
  ipAddress: null,
  page: 1,
  limit: 20,
};

const ALL_FILTERS: LegacyPasswordResetHistoryFilters = {
  employeeCode: "  NV001  ",
  status: "forgot_password_failed",
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  ipAddress: "  192.168.1  ",
  page: 3,
  limit: 25,
};

describe("truy vấn lịch sử đặt lại mật khẩu giữ nguyên sau khi rút", () => {
  const cases: [string, LegacyPasswordResetHistoryFilters][] = [
    ["không lọc gì", NO_FILTERS],
    ["lọc đủ mọi tham số", ALL_FILTERS],
    [
      "status all thì bỏ qua bộ lọc action thứ hai",
      { ...NO_FILTERS, status: "all" },
    ],
    ["chỉ lọc theo IP", { ...NO_FILTERS, ipAddress: "10.0.0" }],
    ["chỉ lọc theo ngày kết thúc", { ...NO_FILTERS, endDate: "2026-07-31" }],
  ];

  it.each(cases)("%s — chuỗi gọi giống hệt", (_label, filters) => {
    const legacy = recorder();
    const current = recorder();

    legacyPasswordResetHistoryQuery(legacy.client, filters);
    buildPasswordResetHistoryQuery(current.client, filters);

    expect(current.calls).toEqual(legacy.calls);
  });

  it("giữ nguyên count exact và không biến thành truy vấn head", () => {
    const current = recorder();

    buildPasswordResetHistoryQuery(current.client, NO_FILTERS);

    expect(current.calls[0].selectOptions).toEqual({ count: "exact" });
  });

  it("phân trang tính đúng offset như bản cũ", () => {
    const legacy = recorder();
    const current = recorder();
    const filters = { ...NO_FILTERS, page: 4, limit: 10 };

    legacyPasswordResetHistoryQuery(legacy.client, filters);
    buildPasswordResetHistoryQuery(current.client, filters);

    const rangeOf = (calls: typeof current.calls) =>
      calls[0].filters.find((filter) => filter.method === "range");

    expect(rangeOf(current.calls)).toEqual({ method: "range", args: [30, 39] });
    expect(rangeOf(current.calls)).toEqual(rangeOf(legacy.calls));
  });
});

describe("ghi security_logs giữ nguyên payload", () => {
  it("payload giống hệt bản cũ, không tự thêm created_at", async () => {
    const legacy = recorder();
    const current = recorder();

    await legacyInsertSecurityLog(
      legacy.client,
      "NV001",
      "change_password_success",
      "10.0.0.1",
      '{"source":"web"}',
    );
    await insertSecurityLog(current.client, {
      employeeId: "NV001",
      action: "change_password_success",
      ipAddress: "10.0.0.1",
      details: '{"source":"web"}',
    });

    expect(current.calls).toEqual(legacy.calls);
    expect(current.calls[0].operation?.args[0]).not.toHaveProperty(
      "created_at",
    );
  });

  it("employee_id null vẫn ghi được như cũ", async () => {
    const legacy = recorder();
    const current = recorder();

    await legacyInsertSecurityLog(legacy.client, null, "x", "10.0.0.1", "{}");
    await insertSecurityLog(current.client, {
      employeeId: null,
      action: "x",
      ipAddress: "10.0.0.1",
      details: "{}",
    });

    expect(current.calls).toEqual(legacy.calls);
  });
});

describe("ghi employee_security_events giữ nguyên payload", () => {
  it("mọi field trừ occurred_at giống hệt bản cũ", async () => {
    const legacy = recorder();
    const current = recorder();

    await legacyInsertEmployeeSecurityEvent(
      legacy.client,
      "NV001",
      "forgot_password_attempt",
      "hash",
      "agent",
      "BẤT KỲ",
      { reason: "test" },
    );
    await insertEmployeeSecurityEvent(current.client, {
      employeeId: "NV001",
      event: "forgot_password_attempt",
      ipHash: "hash",
      userAgent: "agent",
      details: { reason: "test" },
    });

    const withoutTimestamp = (payload: unknown) => {
      const rest = { ...(payload as Record<string, unknown>) };
      delete rest.occurred_at;
      return rest;
    };

    expect(withoutTimestamp(current.calls[0].operation?.args[0])).toEqual(
      withoutTimestamp(legacy.calls[0].operation?.args[0]),
    );
  });

  it("occurred_at vẫn là timestamp giờ Việt Nam, không phải rỗng", async () => {
    const current = recorder();

    await insertEmployeeSecurityEvent(current.client, {
      employeeId: "NV001",
      event: "x",
      ipHash: "hash",
      userAgent: "agent",
    });

    const payload = current.calls[0].operation?.args[0] as Record<
      string,
      unknown
    >;

    expect(payload.occurred_at).toEqual(expect.any(String));
    expect(payload.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("thiếu details thì mặc định object rỗng như cũ", async () => {
    const legacy = recorder();
    const current = recorder();

    await legacyInsertEmployeeSecurityEvent(
      legacy.client,
      null,
      "x",
      "hash",
      "agent",
      "BẤT KỲ",
    );
    await insertEmployeeSecurityEvent(current.client, {
      employeeId: null,
      event: "x",
      ipHash: "hash",
      userAgent: "agent",
    });

    const detailsOf = (calls: typeof current.calls) =>
      (calls[0].operation?.args[0] as Record<string, unknown>).details;

    expect(detailsOf(current.calls)).toEqual({});
    expect(detailsOf(current.calls)).toEqual(detailsOf(legacy.calls));
  });
});
