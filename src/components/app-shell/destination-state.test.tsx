import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DestinationState } from './destination-state';

describe('DestinationState', () => {
  it.each([
    ['Your library', 'History', 'Saved analyses arrive in DEN-19.'],
    ['Your plan', 'Subscription', 'Usage and billing arrive in DEN-20.'],
    ['Your account', 'Settings', 'Account controls are being prepared.'],
  ])('renders %s destination truthfully', (eyebrow, title, description) => {
    render(
      <DestinationState
        eyebrow={eyebrow}
        title={title}
        description={description}
      />,
    );

    expect(screen.getByText(eyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New analysis' })).toHaveAttribute(
      'href',
      '/app',
    );
  });
});
