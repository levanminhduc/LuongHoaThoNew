import { render, screen, fireEvent } from "@testing-library/react";
import {
  VirtualizedTable,
  type VirtualColumn,
} from "@/components/ui/virtualized-table";

const columns: VirtualColumn<{ name: string }>[] = [
  { key: "name", header: "Tên", cell: (row) => row.name, width: "200px" },
];

describe("VirtualizedTable", () => {
  it("renders semantic table when below threshold", () => {
    const data = Array.from({ length: 50 }, (_, index) => ({
      name: `r${index}`,
    }));

    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        rowKey={(_, index) => String(index)}
        enabledThreshold={100}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders grid when virtualized", () => {
    const data = Array.from({ length: 200 }, (_, index) => ({
      name: `r${index}`,
    }));

    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        rowKey={(_, index) => String(index)}
        enabledThreshold={100}
      />,
    );

    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "200");
  });

  it("exposes column headers in virtualized mode", () => {
    const data = Array.from({ length: 200 }, (_, index) => ({
      name: `r${index}`,
    }));

    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        rowKey={(_, index) => String(index)}
        enabledThreshold={100}
      />,
    );

    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
  });

  it("moves focused row with arrow keys", () => {
    const onRowFocus = jest.fn();
    const data = Array.from({ length: 200 }, (_, index) => ({
      name: `r${index}`,
    }));

    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        rowKey={(_, index) => String(index)}
        enabledThreshold={100}
        onRowFocus={onRowFocus}
      />,
    );

    const grid = screen.getByRole("grid");
    grid.focus();
    fireEvent.keyDown(grid, { key: "ArrowDown" });

    expect(onRowFocus).toHaveBeenCalledWith(1);
  });

  it("renders empty state", () => {
    render(
      <VirtualizedTable
        data={[]}
        columns={columns}
        rowKey={(_, index) => String(index)}
        emptyState="Không có dữ liệu"
      />,
    );

    expect(screen.getByText("Không có dữ liệu")).toBeInTheDocument();
  });
});
