import type { ColumnDef } from "@tanstack/react-table";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataTable } from "./DataTable";

interface Row {
  id: number;
  name: string;
  value: number;
  date: string;
}
const data: Row[] = [
  { id: 1, name: "Bravo", value: 9, date: "2026-03-01" },
  { id: 2, name: "alpha", value: 100, date: "2026-01-15" },
  { id: 3, name: "Charlie", value: 20, date: "2026-02-20" },
];
const columns: ColumnDef<Row, any>[] = [ // eslint-disable-line @typescript-eslint/no-explicit-any
  { id: "name", header: "Name", accessorFn: (r) => r.name },
  { id: "value", header: "Value", accessorFn: (r) => r.value, cell: ({ row }) => "USD " + row.original.value, meta: { text: (r) => "USD " + r.value } },
  { id: "date", header: "Date", accessorFn: (r) => r.date },
];

function names() {
  return screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
}
function renderTable(rows = data, onAdd?: () => void) {
  return render(<DataTable data={rows} columns={columns} noun="thing" searchLabel="Search things" rowLabel={(r) => r.name} onAdd={onAdd} />);
}

describe("DataTable", () => {
  it("searches across columns as you type", async () => {
    renderTable();
    const box = screen.getByRole("searchbox", { name: "Search things" });
    await userEvent.type(box, "ALP");
    expect(names()).toEqual(["alpha"]);
    await userEvent.clear(box);
    await userEvent.type(box, "USD 20");
    expect(names()).toEqual(["Charlie"]);
    await userEvent.clear(box);
    await userEvent.type(box, "2026-03");
    expect(names()).toEqual(["Bravo"]);
  });

  it("cycles sort ascending, descending, none", async () => {
    renderTable();
    const header = screen.getByRole("button", { name: /Name/ });
    expect(names()).toEqual(["Bravo", "alpha", "Charlie"]);
    await userEvent.click(header);
    expect(names()).toEqual(["alpha", "Bravo", "Charlie"]);
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(header);
    expect(names()).toEqual(["Charlie", "Bravo", "alpha"]);
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "descending");
    await userEvent.click(header);
    expect(names()).toEqual(["Bravo", "alpha", "Charlie"]);
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "none");
  });

  it("sorts numbers and dates by value, not as text", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("button", { name: /Value/ }));
    expect(names()).toEqual(["Bravo", "Charlie", "alpha"]); // 9, 20, 100 (text order would put 100 first)
    await userEvent.click(screen.getByRole("button", { name: /Date/ }));
    expect(names()).toEqual(["alpha", "Charlie", "Bravo"]);
  });

  it("shows a message when nothing matches", async () => {
    renderTable();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No things match your search.")).toBeInTheDocument();
  });

  it("shows an empty message and the Add button for an empty table", async () => {
    let added = 0;
    renderTable([], () => added++);
    expect(screen.getByText("No things yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add thing" }));
    expect(added).toBe(1);
  });
});
