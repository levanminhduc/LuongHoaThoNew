import { readFileSync } from "fs";
import { join } from "path";
import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import {
  legacyLookupEmployeeQuery,
  legacySignBonusEmployeeQuery,
} from "../__fixtures__/legacy-employee-auth-query";
import { findEmployeeAuthRecord } from "../employee-repository";
import type { SupabaseServiceClient } from "../employee-repository";

const EMPLOYEE_ID = "NV001";

function recordLegacy(
  query: (
    supabase: SupabaseServiceClient,
    employeeId: string,
  ) => Promise<unknown>,
) {
  const recorder = createQueryRecorder([{ data: null }]);
  return query(
    recorder.client as unknown as SupabaseServiceClient,
    EMPLOYEE_ID,
  ).then(() => recorder.calls);
}

function recordCurrent() {
  const recorder = createQueryRecorder([{ data: null }]);
  return findEmployeeAuthRecord(
    recorder.client as unknown as SupabaseServiceClient,
    EMPLOYEE_ID,
  ).then(() => recorder.calls);
}

describe("findEmployeeAuthRecord giữ nguyên truy vấn của lookup", () => {
  it("bảng, select, bộ lọc và terminal giống hệt bản trước khi rút", async () => {
    const legacy = await recordLegacy(legacyLookupEmployeeQuery);
    const current = await recordCurrent();

    expect(current).toEqual(legacy);
  });
});

describe("khác biệt đã biết và chấp nhận ở sign-bonus", () => {
  it("bảng, bộ lọc và terminal không đổi", async () => {
    const [legacy] = await recordLegacy(legacySignBonusEmployeeQuery);
    const [current] = await recordCurrent();

    expect(current.table).toBe(legacy.table);
    expect(current.filters).toEqual(legacy.filters);
    expect(current.terminal).toBe(legacy.terminal);
  });

  it("select rộng thêm đúng 3 cột hồ sơ, không thêm cột nào khác", async () => {
    const [legacy] = await recordLegacy(legacySignBonusEmployeeQuery);
    const [current] = await recordCurrent();

    const columnsOf = (select?: string) =>
      (select ?? "").split(",").map((column) => column.trim());
    const added = columnsOf(current.select).filter(
      (column) => !columnsOf(legacy.select).includes(column),
    );

    expect(added).toEqual(["full_name", "department", "chuc_vu"]);
    expect(columnsOf(current.select)).toEqual(
      expect.arrayContaining(columnsOf(legacy.select)),
    );
  });

  it("ba cột thêm không rời khỏi server: route không đọc cột nào của chúng, không spread bản ghi", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/employee/sign-bonus/route.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/employee\.full_name/);
    expect(source).not.toMatch(/employee\.department/);
    expect(source).not.toMatch(/employee\.chuc_vu/);
    expect(source).not.toMatch(/\.\.\.employee\b/);
  });
});
