import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type SortingFn,
  type SortingState,
} from "@tanstack/react-table";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, EmptyState, Panel, cx, inputClass } from "./ui";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** The text shown for this cell, used by the search box. Defaults to the sort value. */
    text?: (row: TData) => string;
    align?: "right";
    mono?: boolean;
  }
}

/** Numbers and ISO dates compare by value; text compares ignoring case, with numbers inside text in order. */
const compareValues: SortingFn<any> = (a, b, id) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const x = a.getValue(id);
  const y = b.getValue(id);
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), "en", { numeric: true, sensitivity: "base" });
};

export interface RowActions<T> {
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  searchLabel,
  actions,
  toolbar,
  noun,
  onAdd,
  rowLabel,
}: {
  data: T[];
  columns: ColumnDef<T, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  searchLabel: string;
  actions?: RowActions<T>;
  toolbar?: ReactNode;
  noun: string;
  onAdd?: () => void;
  rowLabel: (row: T) => string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");

  const globalFilterFn: FilterFn<T> = (row, _id, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return row.getAllCells().some((cell) => {
      const meta = cell.column.columnDef.meta;
      const text = meta?.text ? meta.text(row.original) : String(cell.getValue() ?? "");
      return text.toLowerCase().includes(q);
    });
  };

  const table = useReactTable({
    data,
    columns,
    defaultColumn: { sortingFn: compareValues, sortUndefined: "last" },
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    sortDescFirst: false,
    enableSortingRemoval: true,
  });

  const rows = table.getRowModel().rows;
  const empty = data.length === 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative block w-[320px] max-w-full">
          <span className="sr-only">{searchLabel}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={searchLabel}
            className={cx(inputClass, "bg-panel pl-9 shadow-panel ring-0")}
          />
        </label>
        {toolbar}
      </div>
      <Panel className="overflow-hidden p-0">
        {empty ? (
          <EmptyState
            message={`No ${noun}s yet.`}
            action={onAdd && <Button onClick={onAdd}>Add {noun}</Button>}
          />
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const dir = h.column.getIsSorted();
                    const right = h.column.columnDef.meta?.align === "right";
                    return (
                      <th
                        key={h.id}
                        scope="col"
                        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                        className={cx("h-11 px-4 text-xs font-semibold text-muted", right ? "text-right" : "text-left")}
                      >
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cx(
                            "inline-flex items-center gap-1 rounded-md py-1 hover:text-ink",
                            right && "flex-row-reverse",
                          )}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === "asc" ? (
                            <ArrowUp className="size-3.5 text-ink" aria-hidden />
                          ) : dir === "desc" ? (
                            <ArrowDown className="size-3.5 text-ink" aria-hidden />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
                          )}
                        </button>
                      </th>
                    );
                  })}
                  {actions && <th className="w-12" aria-label="Actions" />}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="h-12 border-t border-soft/80 hover:bg-page/70">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <td
                        key={cell.id}
                        className={cx(
                          "px-4",
                          meta?.align === "right" && "text-right",
                          meta?.mono && "font-mono text-[13px]",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="pr-3 text-right">
                      <RowMenu label={rowLabel(row.original)} onEdit={() => actions.onEdit(row.original)} onDelete={() => actions.onDelete(row.original)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!empty && rows.length === 0 && <EmptyState message={`No ${noun}s match your search.`} />}
      </Panel>
    </div>
  );
}

export function RowMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Actions for ${label}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink data-[state=open]:bg-soft"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-36 rounded-xl bg-panel p-1.5 shadow-[var(--shadow-lift)]"
        >
          <Menu.Item
            onSelect={onEdit}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-soft"
          >
            <Pencil className="size-4" aria-hidden /> Edit
          </Menu.Item>
          <Menu.Item
            onSelect={onDelete}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-alert-text outline-none data-[highlighted]:bg-alert-tint"
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
