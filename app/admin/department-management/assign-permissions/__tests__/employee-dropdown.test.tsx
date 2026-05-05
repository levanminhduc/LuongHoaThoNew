import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

const mockEmployees = [
  {
    employee_id: "TP001",
    full_name: "Nguyễn Văn An",
    department: "Sản Xuất",
    chuc_vu: "truong_phong",
  },
  {
    employee_id: "TT002",
    full_name: "Trần Thị Bình",
    department: "Kiểm Tra Chất Lượng",
    chuc_vu: "to_truong",
  },
  {
    employee_id: "TP003",
    full_name: "Lê Văn Cường Với Tên Rất Dài",
    department: "Phòng Ban Có Tên Rất Dài",
    chuc_vu: "truong_phong",
  },
];

type Employee = (typeof mockEmployees)[number];

function EmployeeItem({ employee }: { employee: Employee }) {
  return (
    <div data-testid={`employee-item-${employee.employee_id}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{employee.full_name}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {employee.chuc_vu}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
          <span className="shrink-0">({employee.employee_id})</span>
          <span className="text-blue-600 truncate">{employee.department}</span>
        </div>
      </div>
    </div>
  );
}

function EmployeeList({ employees = mockEmployees }: { employees?: Employee[] }) {
  if (employees.length === 0) {
    return <div data-testid="empty-list">Chọn nhân viên...</div>;
  }
  return (
    <div>
      {employees.map((employee) => (
        <EmployeeItem key={employee.employee_id} employee={employee} />
      ))}
    </div>
  );
}

describe("Employee Dropdown Item Layout", () => {
  test("should display employee name, role, ID, and department", () => {
    render(<EmployeeList />);

    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getAllByText("truong_phong").length).toBe(2);
    expect(screen.getByText("to_truong")).toBeInTheDocument();
    expect(screen.getByText("(TP001)")).toBeInTheDocument();
    expect(screen.getByText("Sản Xuất")).toBeInTheDocument();
  });

  test("should apply truncation classes to long names and departments", () => {
    render(<EmployeeList />);

    const longNameElement = screen.getByText("Lê Văn Cường Với Tên Rất Dài");
    const longDeptElement = screen.getByText("Phòng Ban Có Tên Rất Dài");

    expect(longNameElement).toHaveClass("truncate");
    expect(longDeptElement).toHaveClass("truncate");
  });

  test("should have responsive layout classes", () => {
    render(<EmployeeList />);

    const containers = document.querySelectorAll(
      ".flex.flex-col.sm\\:flex-row",
    );
    expect(containers.length).toBe(mockEmployees.length);
  });

  test("should display department in blue color", () => {
    render(<EmployeeList />);

    const departmentElements = document.querySelectorAll(".text-blue-600");
    expect(departmentElements.length).toBe(mockEmployees.length);
  });

  test("should handle empty employee list", () => {
    render(<EmployeeList employees={[]} />);

    expect(screen.getByTestId("empty-list")).toBeInTheDocument();
    expect(screen.getByText("Chọn nhân viên...")).toBeInTheDocument();
  });
});
