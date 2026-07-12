import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function ProtectedVerificationPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/session-expired');

  return (
    <main className="ui-preview-page">
      <section className="ui-preview-hero">
        <span className="ui-preview-eyebrow">Session verified</span>
        <h1>Your workspace is protected.</h1>
        <p>
          Authentication is active. The full application shell is implemented
          separately in DEN-15.
        </p>
        <Link className="ui-button" href="/onboarding">
          Review preferences
        </Link>
      </section>
    </main>
  );
}
