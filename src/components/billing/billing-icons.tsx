export type BillingIconName =
  | 'map'
  | 'plan'
  | 'chart'
  | 'card'
  | 'external'
  | 'document'
  | 'alert'
  | 'home'
  | 'history'
  | 'settings'
  | 'search'
  | 'download'
  | 'users'
  | 'lock'
  | 'more';

type BillingIconProps = Readonly<{
  name: BillingIconName;
  className?: string;
}>;

export function BillingIcon({ name, className }: BillingIconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
    >
      {name === 'map' && (
        <path
          {...common}
          d="M4 6.5 12 3l8 3.5-8 3.5-8-3.5Zm0 5L12 15l8-3.5M4 16.5 12 20l8-3.5"
          strokeWidth="1.6"
        />
      )}
      {name === 'plan' && (
        <>
          <rect
            {...common}
            x="3.5"
            y="5"
            width="17"
            height="15"
            rx="2"
            strokeWidth="1.6"
          />
          <path {...common} d="M8 3v4m8-4v4M3.5 9.5h17" strokeWidth="1.6" />
        </>
      )}
      {name === 'chart' && (
        <path
          {...common}
          d="M4 19V5m0 14h16M7 15l4-5 3 2 5-7"
          strokeWidth="1.7"
        />
      )}
      {name === 'card' && (
        <>
          <rect
            {...common}
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            strokeWidth="1.6"
          />
          <path {...common} d="M3 9h18M7 15h4" strokeWidth="1.6" />
        </>
      )}
      {name === 'external' && (
        <>
          <path {...common} d="M14 4h6v6m0-6-9 9" strokeWidth="1.7" />
          <path
            {...common}
            d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"
            strokeWidth="1.7"
          />
        </>
      )}
      {name === 'document' && (
        <>
          <path {...common} d="M6 3h8l4 4v14H6z" strokeWidth="1.6" />
          <path {...common} d="M14 3v5h5M9 13h6M9 17h6" strokeWidth="1.6" />
        </>
      )}
      {name === 'alert' && (
        <>
          <path {...common} d="m12 3 9 17H3L12 3Z" strokeWidth="1.6" />
          <path {...common} d="M12 9v5m0 3h.01" strokeWidth="1.8" />
        </>
      )}
      {name === 'home' && (
        <path {...common} d="m4 11 8-7 8 7v9h-6v-6h-4v6H4z" strokeWidth="1.6" />
      )}
      {name === 'history' && (
        <>
          <path {...common} d="M4 5v5h5" strokeWidth="1.6" />
          <path {...common} d="M5.5 9A8 8 0 1 1 4 14" strokeWidth="1.6" />
          <path {...common} d="M12 8v5l3 2" strokeWidth="1.6" />
        </>
      )}
      {name === 'settings' && (
        <>
          <circle {...common} cx="12" cy="12" r="3" strokeWidth="1.6" />
          <path
            {...common}
            d="M19 13.5v-3l-2-.8-.5-1.2.8-2-2.1-2.1-2 .8-1.2-.5-.8-2h-3l-.8 2-1.2.5-2-.8-2.1 2.1.8 2-.5 1.2-2 .8v3l2 .8.5 1.2-.8 2 2.1 2.1 2-.8 1.2.5.8 2h3l.8-2 1.2-.5 2 .8 2.1-2.1-.8-2 .5-1.2 2-.8Z"
            strokeWidth="1.2"
          />
        </>
      )}
      {name === 'search' && (
        <>
          <circle {...common} cx="10.8" cy="10.8" r="6.5" strokeWidth="1.7" />
          <path {...common} d="m16 16 4 4" strokeWidth="1.7" />
        </>
      )}
      {name === 'download' && (
        <path
          {...common}
          d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
          strokeWidth="1.7"
        />
      )}
      {name === 'users' && (
        <>
          <circle {...common} cx="9" cy="8" r="3" strokeWidth="1.6" />
          <circle {...common} cx="17" cy="9" r="2.4" strokeWidth="1.4" />
          <path
            {...common}
            d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2m0-6.5a4 4 0 0 1 6 3.5v2"
            strokeWidth="1.6"
          />
        </>
      )}
      {name === 'lock' && (
        <>
          <rect
            {...common}
            x="5"
            y="10"
            width="14"
            height="11"
            rx="2"
            strokeWidth="1.6"
          />
          <path {...common} d="M8 10V7a4 4 0 0 1 8 0v3" strokeWidth="1.6" />
        </>
      )}
      {name === 'more' && (
        <>
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
