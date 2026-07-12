import type { Metadata } from 'next';

import { AccessForm } from '@/components/auth/access-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = { title: 'Create account — Gleen' };

export default function SignUpPage() {
  return (
    <AuthShell
      visualTitle="Begin with one link."
      visualDescription="Your first video becomes a structured workspace in a few clear steps."
    >
      <AccessForm intent="sign-up" />
    </AuthShell>
  );
}
