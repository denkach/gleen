import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = { title: 'Session expired — Gleen' };

export default function SessionExpiredPage() {
  return (
    <AuthShell
      visualTitle="Return to the signal."
      visualDescription="Your work is safe. Sign in again to continue where you stopped."
    >
      <span className="eyebrow">Secure access</span>
      <h2>Your session expired</h2>
      <p>
        For your security, please sign in again. Your saved work is unchanged.
      </p>
      <Link className="btn btn-primary auth-submit" href="/sign-in">
        Sign in again <span aria-hidden="true">→</span>
      </Link>
    </AuthShell>
  );
}
