import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

type VirtualizedTableProps = {
  data: Record<string, unknown>[];
  schemaFields: ReadonlyArray<string> | null;
  isLoading?: boolean;
};

const DEFAULT_SCHEMA_FIELDS: ReadonlyArray<string> = [
  "title",
  "abstract",
  "authors",
  "publishedDate",
];

export function VirtualizedTable({
  data,
  isLoading = false,
  schemaFields,
}: VirtualizedTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<Record<string, unknown>>();

    return (schemaFields ?? DEFAULT_SCHEMA_FIELDS).map((key) =>
      columnHelper.accessor((row) => row[key], {
        id: key,
        header: key,
        cell: (info) => {
          const value = info.getValue();
          if (Array.isArray(value)) {
            return value.join(", ");
          }
          return String(value ?? "");
        },
      })
    );
  }, [schemaFields]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35,
    overscan: 10,
  });

  return (
    <div ref={tableContainerRef} className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-gray-50 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="flex-1 px-3 py-2 text-center border-b border-r border-slate-300 font-semibold text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white">
          <tr>
            <td
              colSpan={columns.length}
              className="relative"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    className="absolute left-0 w-full flex items-center"
                    style={{
                      top: `${virtualRow.start}px`,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="flex-1 px-3 py-2 border-b border-r border-slate-300 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                        title={String(cell.getValue())}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {isLoading && data.length === 0 && (
                <tr className="absolute left-0 w-full flex items-center">
                  {columns.map((column, index) => (
                    <td
                      key={column.id || index}
                      className="flex-1 px-3 py-2 border-b border-r border-slate-300 text-center"
                    >
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    </td>
                  ))}
                </tr>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
