import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';
import type { Locale } from '@/lib/i18n/locales';

import { BillingMobileNavigation } from './billing-mobile-navigation';

export function BillingPage({
  eyebrow,
  title,
  description,
  ariaBusy,
  locale,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  ariaBusy?: boolean;
  locale: Locale;
  children: ReactNode;
}>) {
  return (
    <section
      className="billing-experience"
      aria-labelledby="billing-page-title"
      aria-busy={ariaBusy}
    >
      <header className="billing-page-head">
        <div>
          <div className="billing-eyebrow">{eyebrow}</div>
          <h1 className="billing-page-title" id="billing-page-title">
            {title}
          </h1>
          <p className="billing-page-subtitle">{description}</p>
        </div>
      </header>
      {children}
      <BillingMobileNavigation locale={locale} />
    </section>
  );
}

export function BillingCard({
  as: Element = 'div',
  className,
  role,
  children,
}: Readonly<{
  as?: 'div' | 'article' | 'aside' | 'section';
  className?: string;
  role?: string;
  children: ReactNode;
}>) {
  return (
    <Element className={cx('billing-card', className)} role={role}>
      {children}
    </Element>
  );
}

export function BillingStatus({
  variant,
  children,
  className,
}: Readonly<{
  variant: 'neutral' | 'positive' | 'warning' | 'negative';
  children: ReactNode;
  className?: string;
}>) {
  return (
    <span
      className={cx('billing-status', `billing-status-${variant}`, className)}
    >
      {children}
    </span>
  );
}

export function BillingPrism() {
  return (
    <div className="billing-prism" aria-hidden="true">
      <svg viewBox="0 0 100 120">
        <defs>
          <linearGradient
            id="billing-prism-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop stopColor="#d6a8ff" />
            <stop offset=".52" stopColor="#7eb7ff" />
            <stop offset="1" stopColor="#62e1df" />
          </linearGradient>
        </defs>
        <path
          d="M50 5 91 105H10L50 5Z"
          fill="rgba(132,91,205,.16)"
          stroke="url(#billing-prism-gradient)"
          strokeWidth="2"
        />
        <path
          d="M50 5v100M10 105l57-62 24 62M10 105l40-38 41 38"
          fill="none"
          stroke="rgba(255,255,255,.38)"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}
