import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@tanstack/react-table";

interface TestData {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<TestData>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

const sampleData: TestData[] = [
  { id: "1", name: "Alpha", status: "active" },
  { id: "2", name: "Beta", status: "inactive" },
  { id: "3", name: "Gamma", status: "active" },
];

describe("Table", () => {
  it("renders column headers", () => {
    render(<Table columns={columns} data={sampleData} />);
    expect(screen.getByText("ID")).toBeDefined();
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
  });

  it("renders data rows", () => {
    render(<Table columns={columns} data={sampleData} />);
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("Gamma")).toBeDefined();
  });

  it("shows skeleton rows when loading", () => {
    const { container } = render(
      <Table columns={columns} data={[]} loading skeletonRows={3} />,
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("shows empty state when no data", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        emptyState={<div>No items found</div>}
      />,
    );
    expect(screen.getByText("No items found")).toBeDefined();
  });

  it("shows error state when provided", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        errorState={<div>Error loading data</div>}
      />,
    );
    expect(screen.getByText("Error loading data")).toBeDefined();
  });

  it("shows nothing when data is empty without empty state", () => {
    render(<Table columns={columns} data={[]} />);
    expect(screen.queryByRole("table")).toBeDefined();
  });

  it("calls onRowClick when a row is clicked", async () => {
    const onRowClick = vi.fn();
    render(
      <Table columns={columns} data={sampleData} onRowClick={onRowClick} />,
    );
    const rows = screen.getAllByText("Alpha");
    rows[0].closest("tr")?.click();
    expect(onRowClick).toHaveBeenCalledWith(sampleData[0]);
  });

  it("shows pagination with row count", () => {
    render(
      <Table
        columns={columns}
        data={sampleData}
        enablePagination
        pageSize={2}
      />,
    );
    expect(screen.getByText("3 total")).toBeDefined();
  });

  it("does not show pagination on single page", () => {
    render(
      <Table
        columns={columns}
        data={sampleData}
        enablePagination
        pageSize={10}
      />,
    );
    expect(screen.queryByText("3 total")).toBeNull();
  });

  it("hides pagination when disabled", () => {
    render(
      <Table columns={columns} data={sampleData} enablePagination={false} />,
    );
    expect(screen.queryByLabelText("Pagination")).toBeNull();
  });

  it("renders with manual pagination", () => {
    render(
      <Table
        columns={columns}
        data={sampleData}
        enablePagination
        manualPagination
        totalItems={100}
        pageSize={3}
      />,
    );
    expect(screen.getByText("100 total")).toBeDefined();
  });

  it("applies custom class names", () => {
    const { container } = render(
      <Table columns={columns} data={sampleData} className="custom-table" />,
    );
    const table = container.querySelector("table");
    expect(table?.className).toContain("custom-table");
  });
});
