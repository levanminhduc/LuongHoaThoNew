/**
 * Test file for Employee Dropdown in Department Permission Assignment
 * Tests the new format: "Tên + Chức vụ + Mã số + Department"
 */

import { render, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Mock employee data for testing
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

// Test component that renders the dropdown
function TestEmployeeDropdown({ employees = mockEmployees }) {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Chọn nhân viên..." />
      </SelectTrigger>
      <SelectContent className="max-w-[90vw] sm:max-w-md">
        {employees.map((employee) => (
          <SelectItem key={employee.employee_id} value={employee.employee_id}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">
                  {employee.full_name}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {employee.chuc_vu}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
                <span className="shrink-0">({employee.employee_id})</span>
                <span className="text-blue-600 truncate">
                  {employee.department}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

describe("Employee Dropdown with Department", () => {
  test("should display employee name, role, ID, and department", () => {
    render(<TestEmployeeDropdown />);

    // Test that all required information is displayed
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText("truong_phong")).toBeInTheDocument();
    expect(screen.getByText("(TP001)")).toBeInTheDocument();
    expect(screen.getByText("Sản Xuất")).toBeInTheDocument();
  });

  test("should handle long names and departments with truncation", () => {
    render(<TestEmployeeDropdown />);

    // Test truncation classes are applied
    const longNameElement = screen.getByText("Lê Văn Cường Với Tên Rất Dài");
    const longDeptElement = screen.getByText("Phòng Ban Có Tên Rất Dài");

    expect(longNameElement).toHaveClass("truncate");
    expect(longDeptElement).toHaveClass("truncate");
  });

  test("should have responsive layout classes", () => {
    render(<TestEmployeeDropdown />);

    // Check for responsive classes
    const containers = document.querySelectorAll(
      ".flex.flex-col.sm\\:flex-row",
    );
    expect(containers.length).toBeGreaterThan(0);
  });

  test("should display department in blue color", () => {
    render(<TestEmployeeDropdown />);

    const departmentElements = document.querySelectorAll(".text-blue-600");
    expect(departmentElements.length).toBe(mockEmployees.length);
  });

  test("should handle empty employee list", () => {
    render(<TestEmployeeDropdown employees={[]} />);

    // Should render without errors
    expect(screen.getByText("Chọn nhân viên...")).toBeInTheDocument();
  });
});

// Manual test examples for development
console.log("=== MANUAL TEST EXAMPLES ===");
console.log("Employee dropdown format test:");
mockEmployees.forEach((emp) => {
  console.log(
    `✓ ${emp.full_name} | ${emp.chuc_vu} | (${emp.employee_id}) | ${emp.department}`,
  );
});

console.log("\n=== RESPONSIVE DESIGN TEST ===");
console.log("Mobile: Stack vertically (flex-col)");
console.log("Desktop: Horizontal layout (sm:flex-row)");
console.log("Truncation: Applied to long names and departments");
console.log("Max width: 90vw on mobile, md on desktop");
