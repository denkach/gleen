import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'History — Gleen',
};

const statusLabel = {
  queued: 'Processing',
  running: 'Processing',
  partial: 'Partial',
  complete: 'Complete',
  failed: 'Failed',
} as const;

export default async function HistoryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');
  const rows = await createSupabaseAnalysisRepository(
    supabase as unknown as SupabaseAnalysisClient,
  ).listOwnedHistory(user.id, 50);

  return (
    <section className="destination-state" aria-labelledby="history-title">
      <div className="page-head">
        <div>
          <span className="eyebrow">Your library</span>
          <h1 id="history-title">History</h1>
        </div>
      </div>
      <div className="panel destination-panel">
        {rows.length === 0 ? (
          <p>No analyses yet.</p>
        ) : (
          <ul>
            {rows.map((row) => {
              const active =
                row.status === 'queued' || row.status === 'running';
              return (
                <li key={row.id}>
                  <Link
                    href={
                      active
                        ? `/app?analysis=${row.id}`
                        : `/app/video/${row.id}`
                    }
                  >
                    <strong>{row.title}</strong>{' '}
                    <span>{statusLabel[row.status]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
