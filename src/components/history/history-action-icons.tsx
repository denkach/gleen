type HistoryActionIconName = 'open' | 'retry' | 'rename' | 'export' | 'delete';

export function HistoryActionIcon({
  name,
}: Readonly<{ name: HistoryActionIconName }>) {
  const paths = {
    open: (
      <>
        <path d="M5 12h13" />
        <path d="m14 8 4 4-4 4" />
      </>
    ),
    retry: (
      <>
        <path d="M18 8V4l-3 3" />
        <path d="M18 7a7 7 0 1 0 1 8" />
      </>
    ),
    rename: (
      <>
        <path d="m5 17 1-4 8-8 3 3-8 8-4 1Z" />
        <path d="M12 18h7" />
      </>
    ),
    export: (
      <>
        <path d="M12 4v10" />
        <path d="m8 8 4-4 4 4" />
        <path d="M5 13v6h14v-6" />
      </>
    ),
    delete: (
      <>
        <path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 13h8l1-13" />
      </>
    ),
  } as const;
  return (
    <svg
      className="history-item-actions__icon"
      data-testid={`history-action-icon-${name}`}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
