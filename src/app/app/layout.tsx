import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { deriveAppIdentity, unavailableUsage } from '@/lib/app-shell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/session-expired');

  return (
    <AppShell identity={deriveAppIdentity(user)} usage={unavailableUsage}>
      {children}
    </AppShell>
  );
}
