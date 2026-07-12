import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Choose a new password — Gleen' };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      visualTitle="Restore access."
      visualDescription="Choose a new password to secure your knowledge workspace."
    >
      <span className="eyebrow">Secure recovery</span>
      <h2>Choose a new password</h2>
      <p>Use at least eight characters with a letter and a number.</p>
      <ResetPasswordForm />
    </AuthShell>
  );
}
