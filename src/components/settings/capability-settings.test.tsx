import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CapabilitySettings } from './capability-settings';

describe('capability settings', () => {
  it('renders unavailable capabilities as status text rather than dead buttons', () => {
    render(
      <CapabilitySettings
        eyebrow="Account"
        title="Integrations"
        description="Exports"
        items={[
          {
            key: 'notion',
            title: 'Notion',
            detail: 'Planned',
            action: { kind: 'unavailable' },
          },
          {
            key: 'history',
            title: 'History',
            detail: 'Available',
            action: {
              kind: 'link',
              href: '/app/history',
              label: 'Open history',
            },
          },
        ]}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open history' })).toHaveAttribute(
      'href',
      '/app/history',
    );
    expect(screen.getByText('Planned')).toBeVisible();
  });
});
