import type { Metadata } from 'next';

import { DestinationState } from '@/components/app-shell/destination-state';

export const metadata: Metadata = {
  title: 'History — Gleen',
};

export default function HistoryPage() {
  return (
    <DestinationState
      eyebrow="Your library"
      title="History"
      description="Saved analyses arrive in DEN-19."
    />
  );
}
