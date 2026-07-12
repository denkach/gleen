import type { ReactNode } from 'react';

type AuthStatusProps = Readonly<{
  children: ReactNode;
  tone?: 'error' | 'success' | 'neutral';
}>;

export function AuthStatus({ children, tone = 'neutral' }: AuthStatusProps) {
  return (
    <p
      className="auth-status"
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      {children}
    </p>
  );
}
