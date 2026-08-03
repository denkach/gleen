import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { appMessages } from '@/lib/i18n/messages/app';

import { DestinationState } from './destination-state';

describe('DestinationState', () => {
  it.each([
    ['Your library', 'History', 'Saved analyses arrive in DEN-19.'],
    ['Your plan', 'Subscription', 'Usage and billing arrive in DEN-20.'],
    ['Your account', 'Settings', 'Account controls are being prepared.'],
  ])('renders %s destination truthfully', (eyebrow, title, description) => {
    render(
      <DestinationState
        copy={appMessages.de.destination}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />,
    );

    expect(screen.getByText(eyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Dieser Arbeitsbereich ist für die nächste Produktphase bereit.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Neue Analyse' })).toHaveAttribute(
      'href',
      '/app',
    );
  });
});
