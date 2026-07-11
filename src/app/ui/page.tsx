import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isUiPreviewEnabled } from '@/lib/ui-preview';

import { UiPreview } from './ui-preview';

export const metadata: Metadata = {
  title: 'Gleen UI primitives',
  robots: { index: false, follow: false },
};

export default function UiPreviewPage() {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  return <UiPreview />;
}
