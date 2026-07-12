import type { Metadata } from 'next';

import { DestinationState } from '@/components/app-shell/destination-state';

export const metadata: Metadata = {
  title: 'Subscription — Gleen',
};

export default function SubscriptionPage() {
  return (
    <DestinationState
      eyebrow="Your plan"
      title="Subscription"
      description="Usage and billing arrive in DEN-20."
    />
  );
}
