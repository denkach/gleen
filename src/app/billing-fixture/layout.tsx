import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isUiPreviewEnabled } from '@/lib/ui-preview';

export const metadata: Metadata = {
  title: 'Billing fixture — Gleen',
  robots: { index: false, follow: false },
};

export default function BillingFixtureLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  return children;
}
