import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Reset your password — Gleen' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      visualTitle="Recover the signal."
      visualDescription="A secure recovery link returns you to your workspace."
    >
      <span className="eyebrow">Account recovery</span>
      <h2>Reset your password</h2>
      <p>Enter your account email and we will send a secure reset link.</p>
      <ForgotPasswordForm />
      <p className="auth-footer">
        <Link href="/sign-in">Return to sign in</Link>
      </p>
    </AuthShell>
  );
}
