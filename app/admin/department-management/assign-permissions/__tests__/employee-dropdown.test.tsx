import { render, screen, fireEvent } from "@testing-library/react";
import { EmployeeCombobox } from "../employee-combobox";
import type { Employee } from "@/lib/hooks/use-employees";

const mockEmployees: Employee[] = [
  {
    employee_id: "TP001",
    full_name: "Nguyễn Văn An",
    department: "Sản Xuất",
    chuc_vu: "truong_phong",
    phone_number: null,
    is_active: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
  {
    employee_id: "TT002",
    full_name: "Trần Thị Bình",
    department: "Kiểm Tra Chất Lượng",
    chuc_vu: "to_truong",
    phone_number: null,
    is_active: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
  {
    employee_id: "TP003",
    full_name: "Lê Văn Cường Với Tên Rất Dài",
    department: "Phòng Ban Có Tên Rất Dài",
    chuc_vu: "truong_phong",
    phone_number: null,
    is_active: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
];

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn();
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
});

function openDropdown() {
  fireEvent.click(screen.getByRole("combobox"));
}

describe("EmployeeCombobox", () => {
  test("shows placeholder when nothing selected", () => {
    render(
      <EmployeeCombobox
        employees={mockEmployees}
        value=""
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByText("Chọn nhân viên...")).toBeInTheDocument();
  });

  test("lists all employees with Vietnamese role labels, not raw slug", () => {
    render(
      <EmployeeCombobox
        employees={mockEmployees}
        value=""
        onValueChange={jest.fn()}
      />,
    );
    openDropdown();

    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getAllByText("Trưởng Phòng").length).toBe(2);
    expect(screen.getByText("Tổ Trưởng")).toBeInTheDocument();
    expect(screen.queryByText("truong_phong")).not.toBeInTheDocument();
    expect(screen.queryByText("to_truong")).not.toBeInTheDocument();
  });

  test("shows full department text without truncation classes", () => {
    render(
      <EmployeeCombobox
        employees={mockEmployees}
        value=""
        onValueChange={jest.fn()}
      />,
    );
    openDropdown();

    const longDept = screen.getByText("Phòng Ban Có Tên Rất Dài");
    expect(longDept).toBeInTheDocument();
    expect(longDept).not.toHaveClass("truncate");
  });

  test("filters by search across name, id, department", () => {
    render(
      <EmployeeCombobox
        employees={mockEmployees}
        value=""
        onValueChange={jest.fn()}
      />,
    );
    openDropdown();

    fireEvent.change(
      screen.getByPlaceholderText("Tìm theo tên, mã NV, phòng ban..."),
      { target: { value: "Bình" } },
    );

    expect(screen.getByText("Trần Thị Bình")).toBeInTheDocument();
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
  });

  test("shows empty state when no match", () => {
    render(
      <EmployeeCombobox
        employees={mockEmployees}
        value=""
        onValueChange={jest.fn()}
      />,
    );
    openDropdown();

    fireEvent.change(
      screen.getByPlaceholderText("Tìm theo tên, mã NV, phòng ban..."),
      { target: { value: "khong-ton-tai-xyz" } },
    );

    expect(screen.getByText("Không tìm thấy nhân viên.")).toBeInTheDocument();
  });

  test("calls onValueChange with employee_id on select", () => {
    const onValueChange = jest.fn();
    render(
      <EmployeeCombobox
        employees={mockEmployees}
        value=""
        onValueChange={onValueChange}
      />,
    );
    openDropdown();

    fireEvent.click(screen.getByText("Nguyễn Văn An"));

    expect(onValueChange).toHaveBeenCalledWith("TP001");
  });

  test("orders by role rank then name A-Z", () => {
    const unordered: Employee[] = [
      { ...mockEmployees[1] }, // to_truong - Trần Thị Bình
      {
        ...mockEmployees[0],
        employee_id: "GD001",
        full_name: "Phạm Văn Zũng",
        chuc_vu: "giam_doc",
      }, // giam_doc
      { ...mockEmployees[0] }, // truong_phong - Nguyễn Văn An
    ];
    render(
      <EmployeeCombobox
        employees={unordered}
        value=""
        onValueChange={jest.fn()}
      />,
    );
    openDropdown();

    const names = screen
      .getAllByText(/Phạm Văn Zũng|Nguyễn Văn An|Trần Thị Bình/)
      .map((el) => el.textContent);

    expect(names).toEqual([
      "Phạm Văn Zũng", // giam_doc (rank cao nhất)
      "Nguyễn Văn An", // truong_phong
      "Trần Thị Bình", // to_truong
    ]);
  });

  test("renders selected employee summary in trigger", () => {
    render(
      <EmployeeCombobox
        employees={mockEmployees}
        value="TT002"
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByText("Trần Thị Bình")).toBeInTheDocument();
    expect(screen.getByText("(TT002)")).toBeInTheDocument();
  });
});
