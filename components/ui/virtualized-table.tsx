"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface VirtualColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  width?: string;
  className?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualColumn<T>[];
  estimateRowHeight?: number;
  overscan?: number;
  enabledThreshold?: number;
  containerHeight?: number | string;
  rowKey: (row: T, index: number) => string;
  emptyState?: ReactNode;
  caption?: string;
  onRowFocus?: (index: number) => void;
  className?: string;
}

export function VirtualizedTable<T>({
  data,
  columns,
  estimateRowHeight = 56,
  overscan = 8,
  enabledThreshold = 100,
  containerHeight = 600,
  rowKey,
  emptyState,
  caption,
  onRowFocus,
  className,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const shouldVirtualize = data.length >= enabledThreshold;

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  useEffect(() => {
    if (!shouldVirtualize) return;

    virtualizer.scrollToIndex(focusedIndex, { align: "auto" });
  }, [focusedIndex, shouldVirtualize, virtualizer]);

  if (data.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground" role="status">
        {emptyState ?? "Không có dữ liệu"}
      </div>
    );
  }

  if (!shouldVirtualize) {
    return (
      <Table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} style={{ width: column.width }}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={rowKey(row, index)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const gridTemplateColumns = columns
    .map((column) => column.width ?? "minmax(120px, 1fr)")
    .join(" ");
  const rowGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns,
    alignItems: "center",
  };
  const height =
    typeof containerHeight === "number"
      ? `${containerHeight}px`
      : containerHeight;

  function updateFocusedIndex(next: number) {
    setFocusedIndex(next);
    onRowFocus?.(next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateFocusedIndex(Math.min(data.length - 1, focusedIndex + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      updateFocusedIndex(Math.max(0, focusedIndex - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      updateFocusedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      updateFocusedIndex(data.length - 1);
    }
  }

  return (
    <div
      ref={parentRef}
      role="grid"
      aria-rowcount={data.length}
      aria-label={caption ?? "Bảng dữ liệu"}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ height, overflow: "auto" }}
      className={cn(
        "rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div
        role="row"
        style={{ ...rowGridStyle, position: "sticky", top: 0, zIndex: 1 }}
        className="border-b bg-background text-sm font-medium"
      >
        {columns.map((column) => (
          <div key={column.key} role="columnheader" className="px-4 py-3">
            {column.header}
          </div>
        ))}
      </div>
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = data[virtualRow.index];
          const isFocused = virtualRow.index === focusedIndex;

          return (
            <div
              key={rowKey(row, virtualRow.index)}
              role="row"
              aria-rowindex={virtualRow.index + 1}
              aria-selected={isFocused}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                ...rowGridStyle,
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={cn(
                "border-b text-sm",
                isFocused && "bg-accent text-accent-foreground",
              )}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  role="gridcell"
                  className={cn("px-4 py-3", column.className)}
                >
                  {column.cell(row, virtualRow.index)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
