import type { Metadata } from 'next';

import { DestinationState } from '@/components/app-shell/destination-state';

export const metadata: Metadata = {
  title: 'Settings — Gleen',
};

export default function SettingsProfilePage() {
  return (
    <DestinationState
      eyebrow="Your account"
      title="Settings"
      description="Account controls are being prepared."
    />
  );
}
