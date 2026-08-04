import Link from 'next/link';
import type { ReactNode } from 'react';

import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { materializeLocaleSwitcherCopy } from '@/lib/i18n/locale-switcher-copy';
import type { Locale } from '@/lib/i18n/locales';
import type { AuthCopy } from '@/lib/i18n/messages/auth';
import type { LocaleSwitcherCopy } from '@/lib/i18n/messages/shared';

import { AuthPrism } from './auth-prism';

type AuthShellProps = Readonly<{
  children: ReactNode;
  locale: Locale;
  copy: AuthCopy;
  localeSwitcherCopy: LocaleSwitcherCopy;
  visualTitle: string;
  visualDescription: string;
}>;

export function AuthShell({
  children,
  locale,
  copy,
  localeSwitcherCopy,
  visualTitle,
  visualDescription,
}: AuthShellProps) {
  return (
    <main className="auth-reference auth-page">
      <section className="auth-visual" aria-label={copy.shell.visualLabel}>
        <Link className="brand" href="/" aria-label={copy.shell.homeLabel}>
          <span className="brand-mark" />
          <span>Gleen</span>
        </Link>
        <AuthPrism />
        <div className="auth-visual-copy">
          <span className="eyebrow">{copy.shell.eyebrow}</span>
          <h1>{visualTitle}</h1>
          <p className="body-md">{visualDescription}</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-top">
          <LocaleSwitcher
            locale={locale}
            copy={materializeLocaleSwitcherCopy(localeSwitcherCopy)}
            variant="auth"
          />
        </div>
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
