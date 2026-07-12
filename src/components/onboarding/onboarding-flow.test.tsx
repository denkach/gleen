import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/onboarding/actions', () => ({
  saveOnboardingPreferences: vi.fn(),
}));

import { defaultOnboardingState } from '@/lib/onboarding/preferences';

import { OnboardingFlow } from './onboarding-flow';

describe('three-step onboarding', () => {
  it('starts with five approved interface-language choices', () => {
    render(<OnboardingFlow initialState={defaultOnboardingState} />);

    expect(screen.getByText('Step 1 of 3')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Interface language' }),
    ).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /English/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('updates selection without relying on color', async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow initialState={defaultOnboardingState} />);

    const ukrainian = screen.getByRole('radio', { name: /Українська/ });
    await user.click(ukrainian);

    expect(ukrainian).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /English/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('resumes the exact saved step and exposes skippable preferences', () => {
    render(
      <OnboardingFlow
        initialState={{ ...defaultOnboardingState, onboardingStep: 2 }}
      />,
    );

    expect(screen.getByText('Step 2 of 3')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Output language' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeVisible();
  });
});
