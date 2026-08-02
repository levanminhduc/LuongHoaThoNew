/**
 * @jest-environment node
 */
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-middleware";
import type { JWTPayload } from "@/lib/auth";

const TARGET = "Tổ May 1";
const OTHER = "Tổ May 2";

type Role = JWTPayload["role"];

function authContextFor(overrides: Partial<JWTPayload>) {
  const payload: JWTPayload = {
    username: "u",
    employee_id: "NV001",
    role: "nhan_vien",
    department: OTHER,
    permissions: [],
    ...overrides,
  } as JWTPayload;

  const token = jwt.sign(payload, process.env.JWT_SECRET as string);
  const request = new NextRequest("http://localhost/api/test", {
    headers: { authorization: `Bearer ${token}` },
  });

  const auth = verifyToken(request);
  if (!auth) throw new Error("token phải hợp lệ trong test này");
  return auth;
}

describe("admin và van_phong đi qua mọi phòng ban", () => {
  it.each<[Role]>([["admin"], ["van_phong"]])(
    "%s truy cập được dù không có allowed_departments",
    (role) => {
      const auth = authContextFor({ role, allowed_departments: [] });

      expect(auth.canAccessDepartment(TARGET)).toBe(true);
      expect(auth.canAccessDepartment(OTHER)).toBe(true);
      expect(auth.canAccessDepartment("Phòng không tồn tại")).toBe(true);
    },
  );
});

describe("bốn role quản lý bị chặn theo allowed_departments", () => {
  const scopedRoles: Role[] = [
    "giam_doc",
    "ke_toan",
    "nguoi_lap_bieu",
    "truong_phong",
  ];

  it.each(scopedRoles)(
    "%s có tên phòng ban trong danh sách thì qua",
    (role) => {
      const auth = authContextFor({ role, allowed_departments: [TARGET] });

      expect(auth.canAccessDepartment(TARGET)).toBe(true);
    },
  );

  it.each(scopedRoles)("%s không có trong danh sách thì bị chặn", (role) => {
    const auth = authContextFor({ role, allowed_departments: [TARGET] });

    expect(auth.canAccessDepartment(OTHER)).toBe(false);
  });

  it.each(scopedRoles)(
    "%s thiếu hẳn allowed_departments thì bị chặn",
    (role) => {
      const auth = authContextFor({ role });

      expect(auth.canAccessDepartment(TARGET)).toBe(false);
    },
  );
});

describe("to_truong chỉ thấy đúng phòng ban của mình", () => {
  it("qua khi trùng phòng ban trên token", () => {
    const auth = authContextFor({ role: "to_truong", department: TARGET });

    expect(auth.canAccessDepartment(TARGET)).toBe(true);
  });

  it("bị chặn ở phòng ban khác, kể cả khi có allowed_departments", () => {
    const auth = authContextFor({
      role: "to_truong",
      department: TARGET,
      allowed_departments: [OTHER],
    });

    expect(auth.canAccessDepartment(OTHER)).toBe(false);
  });
});

describe("nhan_vien không truy cập phòng ban nào", () => {
  it("bị chặn kể cả phòng ban của chính mình", () => {
    const auth = authContextFor({ role: "nhan_vien", department: TARGET });

    expect(auth.canAccessDepartment(TARGET)).toBe(false);
  });
});

describe("cả 8 role đều được phủ", () => {
  const ALL_ROLES: Role[] = [
    "admin",
    "giam_doc",
    "ke_toan",
    "nguoi_lap_bieu",
    "truong_phong",
    "to_truong",
    "van_phong",
    "nhan_vien",
  ];

  it.each(ALL_ROLES)("%s trả về boolean, không ném", (role) => {
    const auth = authContextFor({ role });

    expect(typeof auth.canAccessDepartment(TARGET)).toBe("boolean");
  });

  it("chỉ admin và van_phong qua được khi token không có thông tin phòng ban", () => {
    const passing = ALL_ROLES.filter((role) =>
      authContextFor({ role, department: "" }).canAccessDepartment(TARGET),
    );

    expect(passing).toEqual(["admin", "van_phong"]);
  });
});
