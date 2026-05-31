export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800 ${className}`}
    />
  );
}

export function TableSkeletonRows({
  rows = 6,
  columns,
}: {
  rows?: number;
  columns: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="align-top">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="px-3 py-4">
              <SkeletonBlock
                className={
                  columnIndex === 1
                    ? "h-4 w-11/12"
                    : columnIndex === columns - 1
                      ? "mx-auto h-8 w-8 rounded-xl"
                      : "h-4 w-20"
                }
              />
              {columnIndex === 1 && (
                <SkeletonBlock className="mt-2 h-3 w-2/3" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
