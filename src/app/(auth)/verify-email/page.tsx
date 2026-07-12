import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = { title: 'Check your email — Gleen' };

export default function VerifyEmailPage() {
  return (
    <AuthShell
      visualTitle="Follow the beam."
      visualDescription="Your secure access link is on its way."
    >
      <span className="eyebrow">Verification</span>
      <h2>Check your email</h2>
      <p>Open the verification link in your inbox to continue securely.</p>
      <Link className="btn btn-primary auth-submit" href="/sign-in">
        Return to sign in <span aria-hidden="true">→</span>
      </Link>
    </AuthShell>
  );
}
