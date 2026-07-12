import type { Metadata } from 'next';

import { AccessForm } from '@/components/auth/access-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = { title: 'Sign in — Gleen' };

export default function SignInPage() {
  return (
    <AuthShell
      visualTitle="Return to the signal."
      visualDescription="Every analysis, card, timestamp, and export remains exactly where you left it."
    >
      <AccessForm intent="sign-in" />
    </AuthShell>
  );
}
