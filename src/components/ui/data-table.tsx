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
    <div className="acdm-table-wrap">
      <table className="acdm-table">
        <thead>
          <tr className="acdm-table-head">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`acdm-table-head-cell ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getKey(row)} className="acdm-table-row">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`acdm-table-cell ${col.className ?? ""}`}
                >
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
    success:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800",
    warning:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800",
    error:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    default:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
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
