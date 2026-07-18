import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export default function FixtureHistoryPage() {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  )
    notFound();
  return (
    <main>
      <h1>History</h1>
      <Link href="/app-shell-fixture?journey=recover">
        Resume active analysis
      </Link>
    </main>
  );
}
