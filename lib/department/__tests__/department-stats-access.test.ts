import {
  SALARY_STATS_ROLES,
  redactSalaryStats,
} from "@/lib/department/department-stats-access";

const STATS = [
  {
    name: "Tổ May 1",
    employeeCount: 12,
    payrollCount: 10,
    totalSalary: 120000000,
    averageSalary: 12000000,
  },
  {
    name: "Tổ May 2",
    employeeCount: 5,
    payrollCount: 4,
    totalSalary: 40000000,
    averageSalary: 10000000,
  },
];

describe("danh sách role được xem số tiền lương phòng ban", () => {
  it("gồm các role có thẩm quyền", () => {
    expect([...SALARY_STATS_ROLES].sort()).toEqual(
      [
        "admin",
        "giam_doc",
        "ke_toan",
        "nguoi_lap_bieu",
        "truong_phong",
        "to_truong",
      ].sort(),
    );
  });

  it("không gồm van_phong và nhan_vien", () => {
    expect(SALARY_STATS_ROLES).not.toContain("van_phong");
    expect(SALARY_STATS_ROLES).not.toContain("nhan_vien");
  });
});

describe("che số tiền lương theo role", () => {
  it("van_phong không thấy totalSalary và averageSalary", () => {
    const result = redactSalaryStats("van_phong", STATS);

    for (const department of result) {
      expect(department).not.toHaveProperty("totalSalary");
      expect(department).not.toHaveProperty("averageSalary");
    }
  });

  it("van_phong vẫn thấy số người và số phiếu", () => {
    const result = redactSalaryStats("van_phong", STATS);

    expect(result[0]).toMatchObject({
      name: "Tổ May 1",
      employeeCount: 12,
      payrollCount: 10,
    });
    expect(result[1]).toMatchObject({
      name: "Tổ May 2",
      employeeCount: 5,
      payrollCount: 4,
    });
  });

  it("không làm thay đổi dữ liệu đầu vào", () => {
    redactSalaryStats("van_phong", STATS);

    expect(STATS[0].totalSalary).toBe(120000000);
  });

  it.each(["ke_toan", "giam_doc", "admin", "truong_phong"])(
    "%s giữ nguyên số liệu",
    (role) => {
      expect(redactSalaryStats(role, STATS)).toEqual(STATS);
    },
  );
});
