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

  test("orders by role rank, then department, then name A-Z", () => {
    const make = (
      id: string,
      name: string,
      chuc_vu: string,
      department: string,
    ): Employee => ({
      ...mockEmployees[0],
      employee_id: id,
      full_name: name,
      chuc_vu,
      department,
    });

    const unordered: Employee[] = [
      make("TT-b", "Nguyễn Văn B", "to_truong", "DK01"),
      make("TT-dk10", "Người DK10", "to_truong", "DK10"),
      make("TT-a", "Nguyễn Văn A", "to_truong", "DK01"),
      make("TT-dk2", "Người DK02", "to_truong", "DK02"),
      make("GD", "Giám Đốc X", "giam_doc", ""),
    ];
    render(
      <EmployeeCombobox
        employees={unordered}
        value=""
        onValueChange={jest.fn()}
      />,
    );
    openDropdown();

    const order = screen
      .getAllByText(
        /Giám Đốc X|Nguyễn Văn A|Nguyễn Văn B|Người DK02|Người DK10/,
      )
      .map((el) => el.textContent);

    expect(order).toEqual([
      "Giám Đốc X", // giam_doc trước (rank cao nhất)
      "Nguyễn Văn A", // to_truong · DK01 · tên A
      "Nguyễn Văn B", // to_truong · DK01 · tên B
      "Người DK02", // DK02 (numeric: trước DK10)
      "Người DK10", // DK10
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
