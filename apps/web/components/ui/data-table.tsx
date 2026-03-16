import { cn } from '@/lib/cn';

type Column<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends Record<string, unknown> & { id?: string }>({
  columns,
  rows,
  emptyMessage,
  tone = 'neutral',
}: {
  columns: Array<Column<T>>;
  rows: T[];
  emptyMessage: string;
  tone?: 'neutral' | 'public' | 'admin' | 'partner' | 'manager';
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.5rem] shadow-[var(--shadow-card)]',
        tone === 'public' && 'card-public',
        tone === 'admin' && 'card-admin',
        tone === 'partner' && 'card-partner',
        tone === 'manager' && 'card-manager',
        tone === 'neutral' && 'card-neutral',
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--line)] bg-white/72">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={String(row.id ?? index)}
                  className="border-b border-[var(--line)] transition hover:bg-white/62 last:border-b-0"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn('px-4 py-3 text-[13px] text-[var(--foreground)]', column.className)}
                    >
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-7 text-center text-[13px] text-[var(--muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
