import { notFound } from 'next/navigation';

import { isUiPreviewEnabled } from '@/lib/ui-preview';

export default function HistoryFixtureDestinationPage() {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  return (
    <main data-testid="history-existing-result-destination">
      <h1>Existing saved result</h1>
      <p>No new analysis was started.</p>
    </main>
  );
}
