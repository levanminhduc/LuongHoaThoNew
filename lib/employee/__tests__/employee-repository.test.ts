import { findEmployeeAuthRecord } from "../employee-repository";
import type { SupabaseServiceClient } from "../employee-repository";

function makeSupabase(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result);
  const eq = jest.fn<{ single: typeof single }, [string, string]>(() => ({
    single,
  }));
  const select = jest.fn<{ eq: typeof eq }, [string]>(() => ({ eq }));
  const from = jest.fn<{ select: typeof select }, [string]>(() => ({ select }));

  return {
    client: { from } as unknown as SupabaseServiceClient,
    from,
    select,
    eq,
  };
}

const employeeRow = {
  employee_id: "NV001",
  full_name: "Nguyễn Văn A",
  department: "Tổ May 1",
  chuc_vu: "nhan_vien",
  cccd_hash: "hash-cccd",
  password_hash: null,
  last_password_change_at: null,
};

describe("findEmployeeAuthRecord", () => {
  it("truy van dung bang employees theo employee_id", async () => {
    const supabase = makeSupabase({ data: employeeRow, error: null });

    await findEmployeeAuthRecord(supabase.client, "NV001");

    expect(supabase.from).toHaveBeenCalledWith("employees");
    expect(supabase.eq).toHaveBeenCalledWith("employee_id", "NV001");
  });

  it("chon du cot ma ca ba call site cu deu can", async () => {
    const supabase = makeSupabase({ data: employeeRow, error: null });

    await findEmployeeAuthRecord(supabase.client, "NV001");

    const selected = supabase.select.mock.calls[0][0];
    for (const column of [
      "employee_id",
      "full_name",
      "department",
      "chuc_vu",
      "cccd_hash",
      "password_hash",
      "last_password_change_at",
    ]) {
      expect(selected).toContain(column);
    }
  });

  it("khong bao gio select sao", async () => {
    const supabase = makeSupabase({ data: employeeRow, error: null });

    await findEmployeeAuthRecord(supabase.client, "NV001");

    expect(supabase.select.mock.calls[0][0]).not.toContain("*");
  });

  it("tra ve ban ghi khi tim thay", async () => {
    const supabase = makeSupabase({ data: employeeRow, error: null });

    const found = await findEmployeeAuthRecord(supabase.client, "NV001");

    expect(found?.employee_id).toBe("NV001");
    expect(found?.cccd_hash).toBe("hash-cccd");
  });

  it("tra ve null khi khong tim thay", async () => {
    const supabase = makeSupabase({ data: null, error: null });

    expect(await findEmployeeAuthRecord(supabase.client, "NV404")).toBeNull();
  });

  it("tra ve null khi truy van loi thay vi nem", async () => {
    const supabase = makeSupabase({
      data: null,
      error: { message: "connection reset" },
    });

    expect(await findEmployeeAuthRecord(supabase.client, "NV001")).toBeNull();
  });
});
