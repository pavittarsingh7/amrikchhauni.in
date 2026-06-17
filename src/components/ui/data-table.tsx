interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  keyField: keyof T | ((row: T) => string);
}

export function DataTable<T extends object>({
  columns,
  data,
  emptyMessage = "No records found",
  keyField,
}: DataTableProps<T>) {
  function getKey(row: T): string {
    if (typeof keyField === "function") return keyField(row);
    return String(row[keyField]);
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-medium ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getKey(row)}
              className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-slate-300 ${col.className ?? ""}`}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({
  status,
  variant = "default",
}: {
  status: string;
  variant?: "success" | "warning" | "error" | "default";
}) {
  const colors = {
    success: "bg-green-950/50 text-green-400 border-green-800",
    warning: "bg-yellow-950/50 text-yellow-400 border-yellow-800",
    error: "bg-red-950/50 text-red-400 border-red-800",
    default: "bg-slate-800 text-slate-400 border-slate-700",
  };

  const autoVariant =
    ["online", "started", "live", "running"].includes(status.toLowerCase())
      ? "success"
      : ["stopped", "offline", "archived"].includes(status.toLowerCase())
        ? "error"
        : ["pending", "planned", "beta"].includes(status.toLowerCase())
          ? "warning"
          : variant;

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${colors[autoVariant]}`}
    >
      {status}
    </span>
  );
}
