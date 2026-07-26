import type { ReactNode } from 'react';

type HistoryToolbarIconProps = Readonly<{
  name: string;
  children: ReactNode;
}>;

function HistoryToolbarIcon({ name, children }: HistoryToolbarIconProps) {
  return (
    <svg
      className={`history-control-icon history-control-icon--${name}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function HistoryFilterIcon() {
  return (
    <HistoryToolbarIcon name="filter">
      <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
    </HistoryToolbarIcon>
  );
}

export function HistorySortIcon() {
  return (
    <HistoryToolbarIcon name="sort">
      <path d="m8 10 4 4 4-4" />
    </HistoryToolbarIcon>
  );
}

export function HistoryListIcon() {
  return (
    <HistoryToolbarIcon name="list">
      <path d="M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12" />
    </HistoryToolbarIcon>
  );
}

export function HistoryGridIcon() {
  return (
    <HistoryToolbarIcon name="grid">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </HistoryToolbarIcon>
  );
}
