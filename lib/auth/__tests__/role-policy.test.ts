import {
  MANAGEABLE_ROLES,
  getManageableRoles,
  canCreateEmployee,
  canDeleteEmployee,
  canManageEmployee,
  canAssignRole,
} from "@/lib/auth/role-policy";

const ALL_ROLES = [
  "admin",
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
  "truong_phong",
  "to_truong",
  "van_phong",
  "nhan_vien",
];

const actorOf = (role: string) => ({ role, employeeId: "ACTOR1" });
const targetOf = (role: string, employeeId = "TARGET1") => ({
  role,
  employeeId,
});

describe("danh sách chức vụ được quản lý", () => {
  it("admin quản lý mọi chức vụ trừ admin", () => {
    expect([...getManageableRoles("admin")].sort()).toEqual(
      ALL_ROLES.filter((role) => role !== "admin").sort(),
    );
  });

  it("van_phong chỉ quản lý truong_phong, to_truong, nhan_vien", () => {
    expect([...getManageableRoles("van_phong")].sort()).toEqual(
      ["nhan_vien", "to_truong", "truong_phong"].sort(),
    );
  });

  it("nguoi_lap_bieu chỉ quản lý to_truong, nhan_vien", () => {
    expect([...getManageableRoles("nguoi_lap_bieu")].sort()).toEqual([
      "nhan_vien",
      "to_truong",
    ]);
  });

  it.each(["giam_doc", "ke_toan", "truong_phong", "to_truong", "nhan_vien"])(
    "%s không quản lý chức vụ nào",
    (role) => {
      expect(getManageableRoles(role)).toEqual([]);
    },
  );

  it("chức vụ lạ không quản lý chức vụ nào", () => {
    expect(getManageableRoles("khong_ton_tai")).toEqual([]);
  });

  it("MANAGEABLE_ROLES khớp getManageableRoles", () => {
    expect([...MANAGEABLE_ROLES.van_phong]).toEqual([
      ...getManageableRoles("van_phong"),
    ]);
  });
});

describe("quyền tạo nhân viên", () => {
  it.each(["admin", "van_phong"])("%s được tạo", (role) => {
    expect(canCreateEmployee(role)).toBe(true);
  });

  it.each([
    "nguoi_lap_bieu",
    "giam_doc",
    "ke_toan",
    "truong_phong",
    "to_truong",
    "nhan_vien",
  ])("%s không được tạo", (role) => {
    expect(canCreateEmployee(role)).toBe(false);
  });
});

describe("quyền gán chức vụ khi tạo mới (target null)", () => {
  it.each([
    ["van_phong", "truong_phong", true],
    ["van_phong", "to_truong", true],
    ["van_phong", "nhan_vien", true],
    ["van_phong", "giam_doc", false],
    ["van_phong", "ke_toan", false],
    ["van_phong", "nguoi_lap_bieu", false],
    ["van_phong", "van_phong", false],
    ["van_phong", "admin", false],
    ["nguoi_lap_bieu", "to_truong", true],
    ["nguoi_lap_bieu", "nhan_vien", true],
    ["nguoi_lap_bieu", "truong_phong", false],
    ["admin", "giam_doc", true],
    ["admin", "van_phong", true],
    ["admin", "admin", false],
    ["truong_phong", "nhan_vien", false],
    ["nhan_vien", "nhan_vien", false],
  ])("%s gán %s -> %s", (actorRole, newRole, expected) => {
    expect(canAssignRole(actorOf(actorRole), null, newRole)).toBe(expected);
  });
});

describe("quyền quản lý (sửa) nhân viên hiện có", () => {
  it("không ai tự sửa chính mình, kể cả van_phong", () => {
    const self = { role: "van_phong", employeeId: "VP001" };

    expect(canManageEmployee(self, self)).toBe(false);
    expect(canManageEmployee(self, targetOf("van_phong", "VP001"))).toBe(false);
  });

  it("nguoi_lap_bieu không sửa được truong_phong và van_phong", () => {
    expect(
      canManageEmployee(actorOf("nguoi_lap_bieu"), targetOf("truong_phong")),
    ).toBe(false);
    expect(
      canManageEmployee(actorOf("nguoi_lap_bieu"), targetOf("van_phong")),
    ).toBe(false);
  });

  it("nguoi_lap_bieu sửa được to_truong và nhan_vien", () => {
    expect(
      canManageEmployee(actorOf("nguoi_lap_bieu"), targetOf("to_truong")),
    ).toBe(true);
    expect(
      canManageEmployee(actorOf("nguoi_lap_bieu"), targetOf("nhan_vien")),
    ).toBe(true);
  });

  it.each(["giam_doc", "ke_toan", "nguoi_lap_bieu", "van_phong", "admin"])(
    "van_phong không sửa được %s",
    (targetRole) => {
      expect(
        canManageEmployee(actorOf("van_phong"), targetOf(targetRole)),
      ).toBe(false);
    },
  );

  it.each(["truong_phong", "to_truong", "nhan_vien"])(
    "van_phong sửa được %s",
    (targetRole) => {
      expect(
        canManageEmployee(actorOf("van_phong"), targetOf(targetRole)),
      ).toBe(true);
    },
  );

  it.each(ALL_ROLES)("admin sửa được nhân viên đang là %s", (targetRole) => {
    expect(canManageEmployee(actorOf("admin"), targetOf(targetRole))).toBe(
      true,
    );
  });

  it.each(["truong_phong", "to_truong", "nhan_vien", "giam_doc", "ke_toan"])(
    "%s không sửa được ai",
    (actorRole) => {
      expect(canManageEmployee(actorOf(actorRole), targetOf("nhan_vien"))).toBe(
        false,
      );
    },
  );
});

describe("quyền gán chức vụ khi sửa nhân viên hiện có", () => {
  it("nguoi_lap_bieu hạ to_truong xuống nhan_vien được", () => {
    expect(
      canAssignRole(
        actorOf("nguoi_lap_bieu"),
        targetOf("to_truong"),
        "nhan_vien",
      ),
    ).toBe(true);
  });

  it("van_phong nâng nhan_vien lên giam_doc bị chặn", () => {
    expect(
      canAssignRole(actorOf("van_phong"), targetOf("nhan_vien"), "giam_doc"),
    ).toBe(false);
  });

  it("van_phong gán chức vụ được phép nhưng cho nhân viên ngoài phạm vi thì bị chặn", () => {
    expect(
      canAssignRole(actorOf("van_phong"), targetOf("ke_toan"), "nhan_vien"),
    ).toBe(false);
  });

  it("van_phong gán cho chính mình bị chặn", () => {
    const self = { role: "van_phong", employeeId: "VP001" };

    expect(canAssignRole(self, self, "nhan_vien")).toBe(false);
  });

  it("admin hạ quyền nhân viên đang mang chuc_vu admin xuống nhan_vien", () => {
    expect(
      canAssignRole(actorOf("admin"), targetOf("admin"), "nhan_vien"),
    ).toBe(true);
  });

  it("admin không gán được chức vụ admin", () => {
    expect(
      canAssignRole(actorOf("admin"), targetOf("nhan_vien"), "admin"),
    ).toBe(false);
  });
});

describe("quyền xoá nhân viên", () => {
  it("van_phong xoá được nhan_vien", () => {
    expect(canDeleteEmployee(actorOf("van_phong"), targetOf("nhan_vien"))).toBe(
      true,
    );
  });

  it("van_phong không xoá được ke_toan", () => {
    expect(canDeleteEmployee(actorOf("van_phong"), targetOf("ke_toan"))).toBe(
      false,
    );
  });

  it("nguoi_lap_bieu không xoá được ai", () => {
    expect(
      canDeleteEmployee(actorOf("nguoi_lap_bieu"), targetOf("nhan_vien")),
    ).toBe(false);
  });

  it("admin xoá được nhân viên đang mang chuc_vu admin", () => {
    expect(canDeleteEmployee(actorOf("admin"), targetOf("admin"))).toBe(true);
  });

  it("van_phong không tự xoá chính mình", () => {
    const self = { role: "van_phong", employeeId: "VP001" };

    expect(canDeleteEmployee(self, self)).toBe(false);
  });
});
