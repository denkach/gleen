import Link from 'next/link';
import type { ReactNode } from 'react';

import { AuthPrism } from './auth-prism';

type AuthShellProps = Readonly<{
  children: ReactNode;
  visualTitle: string;
  visualDescription: string;
}>;

export function AuthShell({
  children,
  visualTitle,
  visualDescription,
}: AuthShellProps) {
  return (
    <main className="auth-reference auth-page">
      <section className="auth-visual" aria-label="Gleen knowledge workspace">
        <Link className="brand" href="/" aria-label="Gleen home">
          <span className="brand-mark" />
          <span>Gleen</span>
        </Link>
        <AuthPrism />
        <div className="auth-visual-copy">
          <span className="eyebrow">Your knowledge workspace</span>
          <h1>{visualTitle}</h1>
          <p className="body-md">{visualDescription}</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-top">
          <button className="btn btn-ghost btn-sm language-btn" type="button">
            EN <span aria-hidden="true">›</span>
          </button>
        </div>
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
