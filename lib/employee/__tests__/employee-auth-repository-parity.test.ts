import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-employee-auth-queries";
import {
  findEmployeeForCccdUpdate,
  findEmployeeForForgotPassword,
  findEmployeeForPasswordChange,
  findEmployeeForPasswordRecovery,
  findEmployeeNamesByIds,
  findEmployeePasswordFlags,
  findEmployeePasswordState,
  searchActiveEmployees,
  updateEmployeeCredentials,
} from "../employee-auth-repository";
import type { SupabaseServiceClient } from "../employee-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

const EMPLOYEE_ID = "NV0001";
const EMPLOYEE_IDS = ["NV0001", "NV0002"];

describe("truy vấn đổi mật khẩu nhân viên giữ nguyên sau khi rút", () => {
  it("lấy hồ sơ để đổi mật khẩu", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPasswordChangeEmployeeQuery(before.client, EMPLOYEE_ID);
    await findEmployeeForPasswordChange(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("hồ sơ đổi mật khẩu vẫn lấy đủ cả hai loại hash và mốc đổi mật khẩu", async () => {
    const after = recorder();

    await findEmployeeForPasswordChange(after.client, EMPLOYEE_ID);

    const columns = after.calls[0].select ?? "";
    expect(columns).toContain("cccd_hash");
    expect(columns).toContain("password_hash");
    expect(columns).toContain("last_password_change_at");
  });

  it("hồ sơ đổi mật khẩu vẫn lấy trạng thái khoá và số lần sai", async () => {
    const after = recorder();

    await findEmployeeForPasswordChange(after.client, EMPLOYEE_ID);

    const columns = after.calls[0].select ?? "";
    expect(columns).toContain("locked_until");
    expect(columns).toContain("failed_login_attempts");
  });

  it("cập nhật thông tin đăng nhập chỉ chạm đúng một nhân viên", async () => {
    const before = recorder();
    const after = recorder();
    const updateData = { password_hash: "hash" };

    await legacy.legacyUpdateCredentialsQuery(
      before.client,
      EMPLOYEE_ID,
      updateData,
    );
    await updateEmployeeCredentials(after.client, EMPLOYEE_ID, updateData);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["employee_id", EMPLOYEE_ID] },
    ]);
  });

  it("cờ bắt buộc đổi mật khẩu", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPasswordFlagsQuery(before.client, EMPLOYEE_ID);
    await findEmployeePasswordFlags(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
  });
});

describe("truy vấn khôi phục mật khẩu giữ nguyên sau khi rút", () => {
  it("hồ sơ khôi phục bằng CCCD", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPasswordRecoveryQuery(before.client, EMPLOYEE_ID);
    await findEmployeeForPasswordRecovery(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("hồ sơ khôi phục vẫn lấy mốc khoá và số lần khôi phục hỏng", async () => {
    const after = recorder();

    await findEmployeeForPasswordRecovery(after.client, EMPLOYEE_ID);

    const columns = after.calls[0].select ?? "";
    expect(columns).toContain("recovery_locked_until");
    expect(columns).toContain("recovery_fail_count");
  });

  it("trạng thái mật khẩu hiện tại", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPasswordStateQuery(before.client, EMPLOYEE_ID);
    await findEmployeePasswordState(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("hồ sơ quên mật khẩu không lấy password_hash", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyForgotPasswordQuery(before.client, EMPLOYEE_ID);
    await findEmployeeForForgotPassword(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).not.toContain("password_hash");
  });
});

describe("tra cứu nhân viên phục vụ cập nhật CCCD giữ nguyên sau khi rút", () => {
  it("lấy nhân viên theo mã trước khi đổi CCCD", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyCccdUpdateEmployeeQuery(before.client, EMPLOYEE_ID);
    await findEmployeeForCccdUpdate(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it.each([
    ["từ khoá thường", "nguyen"],
    ["từ khoá có ký tự đặc biệt của postgrest", "a,b)c"],
  ])("tìm nhân viên đang làm việc — %s", async (_label, query) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySearchActiveEmployeesQuery(before.client, query);
    await searchActiveEmployees(after.client, query);

    expect(after.calls).toEqual(before.calls);
  });

  it("tìm nhân viên vẫn loại người đã nghỉ và giới hạn 20 kết quả", async () => {
    const after = recorder();

    await searchActiveEmployees(after.client, "nguyen");

    expect(after.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["is_active", true],
    });
    expect(after.calls[0].filters).toContainEqual({
      method: "limit",
      args: [20],
    });
  });

  it("lấy tên nhân viên theo danh sách mã", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeNamesByIdsQuery(before.client, EMPLOYEE_IDS);
    await findEmployeeNamesByIds(after.client, EMPLOYEE_IDS);

    expect(after.calls).toEqual(before.calls);
  });
});
