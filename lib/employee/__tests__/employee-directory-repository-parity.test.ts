import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-employee-directory-queries";
import {
  findActiveEmployeeForPermission,
  findActiveEmployeeNamesByIds,
  findActiveEmployeeProfile,
  findAllActiveEmployees,
  findAllEmployeeIds,
  findAllEmployeeNames,
  findEmployeeCredentialProfile,
  findEmployeeDirectoryByIds,
  findEmployeeIdsIn,
  findEmployeeLookupRecord,
  findEmployeeNamesByIdsOrdered,
  findEmployeeProfile,
  findEmployeeProfilesByIds,
  findFirstActiveSignerByPosition,
  findSampleActiveEmployees,
  findSampleEmployeeIds,
  findUnsignedEmployeePreview,
  probeEmployeesTable,
} from "../employee-directory-repository";
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
const ACTIVE_FILTER = { method: "eq", args: ["is_active", true] };

describe("tra cứu mã nhân viên giữ nguyên sau khi rút", () => {
  it("kiểm tra kết nối bảng nhân viên", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyProbeEmployeesQuery(before.client);
    await probeEmployeesTable(after.client);

    expect(after.calls).toEqual(before.calls);
  });

  it("danh sách toàn bộ mã nhân viên không lọc trạng thái", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAllEmployeeIdsQuery(before.client);
    await findAllEmployeeIds(after.client);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([]);
  });

  it("đối chiếu mã nhân viên khi import chấm công", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeIdsInQuery(before.client, EMPLOYEE_IDS);
    await findEmployeeIdsIn(after.client, EMPLOYEE_IDS);

    expect(after.calls).toEqual(before.calls);
  });

  it("mã nhân viên mẫu cho template", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySampleEmployeeIdsQuery(before.client);
    await findSampleEmployeeIds(after.client);

    expect(after.calls).toEqual(before.calls);
  });

  it("nhân viên mẫu đang làm việc cho template đồng bộ", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySampleActiveEmployeesQuery(before.client);
    await findSampleActiveEmployees(after.client);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual(ACTIVE_FILTER);
  });
});

describe("hồ sơ một nhân viên giữ nguyên sau khi rút", () => {
  it("hồ sơ cơ bản không lọc trạng thái", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeProfileQuery(before.client, EMPLOYEE_ID);
    await findEmployeeProfile(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).not.toContainEqual(ACTIVE_FILTER);
  });

  it("hồ sơ ký duyệt bắt buộc nhân viên còn làm việc", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyActiveEmployeeProfileQuery(before.client, EMPLOYEE_ID);
    await findActiveEmployeeProfile(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual(ACTIVE_FILTER);
  });

  it("hồ sơ kèm hash để ký nhận lương", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeCredentialProfileQuery(
      before.client,
      EMPLOYEE_ID,
    );
    await findEmployeeCredentialProfile(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("hồ sơ tra cứu lương lấy cả phòng ban và chức vụ lẫn hash", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeLookupRecordQuery(before.client, EMPLOYEE_ID);
    await findEmployeeLookupRecord(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
    const columns = after.calls[0].select ?? "";
    expect(columns).toContain("cccd_hash");
    expect(columns).toContain("last_password_change_at");
    expect(columns).toContain("chuc_vu");
  });

  it("hồ sơ phân quyền phòng ban bắt buộc còn làm việc", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeForPermissionQuery(before.client, EMPLOYEE_ID);
    await findActiveEmployeeForPermission(after.client, EMPLOYEE_ID);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual(ACTIVE_FILTER);
  });

  it("người ký đầu tiên theo chức vụ giữ nguyên thứ tự và giới hạn 1", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyFirstActiveSignerQuery(before.client, "giam_doc");
    await findFirstActiveSignerByPosition(after.client, "giam_doc");

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual({
      method: "limit",
      args: [1],
    });
    expect(after.calls[0].terminal).toBe("single");
  });
});

describe("danh sách nhiều nhân viên giữ nguyên sau khi rút", () => {
  it("toàn bộ tên nhân viên cho truy vấn dự phòng xuất lương", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAllEmployeeNamesQuery(before.client);
    await findAllEmployeeNames(after.client);

    expect(after.calls).toEqual(before.calls);
  });

  it("tên nhân viên theo lô mã, có sắp xếp", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeNamesOrderedQuery(before.client, EMPLOYEE_IDS);
    await findEmployeeNamesByIdsOrdered(after.client, EMPLOYEE_IDS);

    expect(after.calls).toEqual(before.calls);
  });

  it("tên nhân viên đã ký chỉ lấy người còn làm việc", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyActiveEmployeeNamesQuery(before.client, EMPLOYEE_IDS);
    await findActiveEmployeeNamesByIds(after.client, EMPLOYEE_IDS);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual(ACTIVE_FILTER);
  });

  it("hai truy vấn tên theo lô khác nhau ở bộ lọc trạng thái", async () => {
    const ordered = recorder();
    const activeOnly = recorder();

    await findEmployeeNamesByIdsOrdered(ordered.client, EMPLOYEE_IDS);
    await findActiveEmployeeNamesByIds(activeOnly.client, EMPLOYEE_IDS);

    expect(ordered.calls[0].filters).not.toContainEqual(ACTIVE_FILTER);
    expect(activeOnly.calls[0].filters).toContainEqual(ACTIVE_FILTER);
  });

  it("hồ sơ theo lô mã cho xuất chấm công", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeProfilesByIdsQuery(before.client, EMPLOYEE_IDS);
    await findEmployeeProfilesByIds(after.client, EMPLOYEE_IDS);

    expect(after.calls).toEqual(before.calls);
  });

  it("danh bạ theo lô mã có kèm cờ đang làm việc", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeDirectoryByIdsQuery(before.client, EMPLOYEE_IDS);
    await findEmployeeDirectoryByIds(after.client, EMPLOYEE_IDS);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).toContain("is_active");
  });

  it("xem trước nhân viên chưa ký giữ nguyên giới hạn 10", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyUnsignedEmployeePreviewQuery(
      before.client,
      EMPLOYEE_IDS,
    );
    await findUnsignedEmployeePreview(after.client, EMPLOYEE_IDS);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual({
      method: "limit",
      args: [10],
    });
  });

  it("toàn bộ nhân viên đang làm việc cho đối chiếu dữ liệu", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAllActiveEmployeesQuery(before.client);
    await findAllActiveEmployees(after.client);

    expect(after.calls).toEqual(before.calls);
  });
});
