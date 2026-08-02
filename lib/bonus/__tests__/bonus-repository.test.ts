import { findBonusSignFlags } from "../bonus-repository";
import {
  findActiveBonusSignatureByType,
  findActiveBonusSignatures,
  findActiveSigner,
  insertBonusSignature,
} from "../bonus-signature-repository";
import type { SupabaseServiceClient } from "../bonus-repository";

type QueryResult = { data: unknown; error: unknown };

function makeChain(result: QueryResult, terminal?: "single" | "maybeSingle") {
  const calls: { table?: string; columns?: string; filters: string[][] } = {
    filters: [],
  };

  const node: Record<string, unknown> = {};
  node.eq = jest.fn((column: string, value: unknown) => {
    calls.filters.push([column, String(value)]);
    return node;
  });
  node.single = jest.fn().mockResolvedValue(result);
  node.maybeSingle = jest.fn().mockResolvedValue(result);
  node.insert = jest.fn(() => node);
  node.select = jest.fn((columns: string) => {
    calls.columns = columns;
    return node;
  });
  node.then = terminal
    ? undefined
    : (resolve: (value: QueryResult) => unknown) => resolve(result);

  const from = jest.fn((table: string) => {
    calls.table = table;
    return node;
  });

  return { client: { from } as unknown as SupabaseServiceClient, calls, node };
}

const signatureRow = {
  signature_type: "giam_doc",
  bonus_type: "thuong_le",
  bonus_period: "2026-01",
  signed_by_id: "NV001",
  signed_by_name: "Nguyễn Văn A",
  department: "Tổ May 1",
  signed_at: "2026-01-15 09:00:00",
  notes: null,
};

describe("findBonusSignFlags", () => {
  it("trả mảng cờ đã ký và lọc đúng đợt thưởng", async () => {
    const rows = [{ employee_id: "NV001", is_signed: true }];
    const { client, calls } = makeChain({ data: rows, error: null });

    await expect(
      findBonusSignFlags(client, "thuong_le", "2026-01"),
    ).resolves.toEqual(rows);
    expect(calls.table).toBe("employee_bonuses");
    expect(calls.filters).toEqual([
      ["bonus_type", "thuong_le"],
      ["bonus_period", "2026-01"],
    ]);
  });

  it("data null nhưng không lỗi thì trả mảng rỗng, không phải null", async () => {
    const { client } = makeChain({ data: null, error: null });

    await expect(
      findBonusSignFlags(client, "thuong_le", "2026-01"),
    ).resolves.toEqual([]);
  });

  it("lỗi truy vấn trả null để caller phân biệt với đợt rỗng", async () => {
    const { client } = makeChain({ data: null, error: { message: "boom" } });

    await expect(
      findBonusSignFlags(client, "thuong_le", "2026-01"),
    ).resolves.toBeNull();
  });
});

describe("findActiveSigner", () => {
  it("chỉ lấy nhân viên còn hoạt động", async () => {
    const row = {
      employee_id: "NV001",
      full_name: "Nguyễn Văn A",
      department: "Tổ May 1",
      chuc_vu: "giam_doc",
    };
    const { client, calls } = makeChain({ data: row, error: null }, "single");

    await expect(findActiveSigner(client, "NV001")).resolves.toEqual(row);
    expect(calls.table).toBe("employees");
    expect(calls.filters).toEqual([
      ["employee_id", "NV001"],
      ["is_active", "true"],
    ]);
  });

  it("không tìm thấy thì trả null", async () => {
    const { client } = makeChain(
      { data: null, error: { message: "no rows" } },
      "single",
    );

    await expect(findActiveSigner(client, "NV404")).resolves.toBeNull();
  });
});

describe("findActiveBonusSignatures", () => {
  it("lọc theo loại, đợt và is_active", async () => {
    const { client, calls } = makeChain({ data: [signatureRow], error: null });

    await expect(
      findActiveBonusSignatures(client, "thuong_le", "2026-01"),
    ).resolves.toEqual([signatureRow]);
    expect(calls.table).toBe("bonus_management_signatures");
    expect(calls.filters).toEqual([
      ["bonus_type", "thuong_le"],
      ["bonus_period", "2026-01"],
      ["is_active", "true"],
    ]);
  });

  it("không select(*) — chỉ lấy đúng 8 cột của BonusSignatureRecord", async () => {
    const { client, calls } = makeChain({ data: [], error: null });

    await findActiveBonusSignatures(client, "thuong_le", "2026-01");

    expect(calls.columns).not.toContain("*");
    expect(calls.columns?.split(", ")).toHaveLength(8);
  });

  it("lỗi truy vấn trả null", async () => {
    const { client } = makeChain({ data: null, error: { message: "boom" } });

    await expect(
      findActiveBonusSignatures(client, "thuong_le", "2026-01"),
    ).resolves.toBeNull();
  });
});

describe("findActiveBonusSignatureByType", () => {
  it("thêm bộ lọc signature_type so với truy vấn danh sách", async () => {
    const { client, calls } = makeChain(
      { data: signatureRow, error: null },
      "maybeSingle",
    );

    await expect(
      findActiveBonusSignatureByType(
        client,
        "thuong_le",
        "2026-01",
        "giam_doc",
      ),
    ).resolves.toEqual(signatureRow);
    expect(calls.filters).toEqual([
      ["bonus_type", "thuong_le"],
      ["bonus_period", "2026-01"],
      ["signature_type", "giam_doc"],
      ["is_active", "true"],
    ]);
  });

  it("chưa có chữ ký thì trả null chứ không phải undefined", async () => {
    const { client } = makeChain({ data: null, error: null }, "maybeSingle");

    await expect(
      findActiveBonusSignatureByType(
        client,
        "thuong_le",
        "2026-01",
        "giam_doc",
      ),
    ).resolves.toBeNull();
  });
});

describe("insertBonusSignature", () => {
  it("trả bản ghi vừa chèn", async () => {
    const { client, calls } = makeChain(
      { data: signatureRow, error: null },
      "single",
    );

    await expect(insertBonusSignature(client, signatureRow)).resolves.toEqual(
      signatureRow,
    );
    expect(calls.table).toBe("bonus_management_signatures");
  });

  it("chèn lỗi trả null thay vì ném", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { client } = makeChain(
      { data: null, error: { message: "duplicate key" } },
      "single",
    );

    await expect(
      insertBonusSignature(client, signatureRow),
    ).resolves.toBeNull();
    consoleErrorSpy.mockRestore();
  });
});
