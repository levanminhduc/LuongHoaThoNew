import { createQueryRecorder } from "../__fixtures__/query-recorder";
import type { SupabaseServiceClient } from "@/lib/employee/employee-repository";

function clientOf(recorder: ReturnType<typeof createQueryRecorder>) {
  return recorder.client as unknown as SupabaseServiceClient;
}

describe("ghi lại chuỗi gọi PostgREST", () => {
  it("ghi tên bảng và chuỗi select", async () => {
    const recorder = createQueryRecorder([{ data: [] }]);

    await clientOf(recorder).from("employees").select("employee_id, full_name");

    expect(recorder.calls).toEqual([
      {
        table: "employees",
        select: "employee_id, full_name",
        filters: [],
      },
    ]);
  });

  it("ghi bộ lọc đúng thứ tự đã gọi", async () => {
    const recorder = createQueryRecorder([{ data: [] }]);

    await clientOf(recorder)
      .from("payrolls")
      .select("*")
      .eq("salary_month", "2026-08")
      .in("employee_id", ["NV001", "NV002"])
      .order("created_at", { ascending: false })
      .range(0, 49);

    expect(recorder.calls[0].filters).toEqual([
      { method: "eq", args: ["salary_month", "2026-08"] },
      { method: "in", args: ["employee_id", ["NV001", "NV002"]] },
      { method: "order", args: ["created_at", { ascending: false }] },
      { method: "range", args: [0, 49] },
    ]);
  });

  it("ghi cặp count/head của truy vấn đếm", async () => {
    const recorder = createQueryRecorder([{ count: 12 }]);

    await clientOf(recorder)
      .from("payrolls")
      .select("*", { count: "exact", head: true })
      .eq("salary_month", "2026-08");

    expect(recorder.calls[0].selectOptions).toEqual({
      count: "exact",
      head: true,
    });
  });

  it("phân biệt truy vấn đếm với truy vấn trả dòng", async () => {
    const recorder = createQueryRecorder([{ data: [] }]);

    await clientOf(recorder).from("payrolls").select("*");

    expect(recorder.calls[0].selectOptions).toBeUndefined();
  });

  it("ghi terminal single và maybeSingle", async () => {
    const recorder = createQueryRecorder([{ data: null }, { data: null }]);
    const client = clientOf(recorder);

    await client
      .from("employees")
      .select("*")
      .eq("employee_id", "NV001")
      .single();
    await client.from("employees").select("*").maybeSingle();

    expect(recorder.calls.map((call) => call.terminal)).toEqual([
      "single",
      "maybeSingle",
    ]);
  });

  it("ghi thao tác ghi dữ liệu", async () => {
    const recorder = createQueryRecorder([{ data: null }, { data: null }]);
    const client = clientOf(recorder);

    await client.from("employees").insert({ employee_id: "NV009" });
    await client.from("employees").update({ full_name: "A" }).eq("id", 1);

    expect(recorder.calls.map((call) => call.operation)).toEqual([
      { method: "insert", args: [{ employee_id: "NV009" }] },
      { method: "update", args: [{ full_name: "A" }] },
    ]);
  });
});

describe("trả kết quả theo kịch bản", () => {
  it("trả data cho truy vấn thứ nhất, lỗi cho truy vấn thứ hai", async () => {
    const recorder = createQueryRecorder([
      { data: [{ employee_id: "NV001" }] },
      { error: { message: "boom", code: "PGRST116" } },
    ]);
    const client = clientOf(recorder);

    const first = await client.from("employees").select("*");
    const second = await client.from("payrolls").select("*");

    expect(first.data).toEqual([{ employee_id: "NV001" }]);
    expect(first.error).toBeNull();
    expect(second.data).toBeNull();
    expect(second.error).toEqual({ message: "boom", code: "PGRST116" });
  });

  it("hết kịch bản thì trả kết quả rỗng thay vì ném", async () => {
    const recorder = createQueryRecorder();

    const result = await clientOf(recorder).from("employees").select("*");

    expect(result).toEqual({ data: null, error: null, count: null });
  });
});

describe("dùng để so hai bản cài đặt", () => {
  const runQuery = (client: SupabaseServiceClient, withDepartment: boolean) => {
    const query = client
      .from("payrolls")
      .select("*, employees!inner(full_name)")
      .eq("salary_month", "2026-08");
    return withDepartment
      ? query.eq("employees.department", "Tổ May 1")
      : query;
  };

  it("hai lần chạy giống nhau thì chuỗi gọi bằng nhau", async () => {
    const left = createQueryRecorder([{ data: [] }]);
    const right = createQueryRecorder([{ data: [] }]);

    await runQuery(clientOf(left), true);
    await runQuery(clientOf(right), true);

    expect(left.calls).toEqual(right.calls);
  });

  it("rớt một bộ lọc thì chuỗi gọi khác nhau", async () => {
    const left = createQueryRecorder([{ data: [] }]);
    const right = createQueryRecorder([{ data: [] }]);

    await runQuery(clientOf(left), true);
    await runQuery(clientOf(right), false);

    expect(left.calls).not.toEqual(right.calls);
  });
});
