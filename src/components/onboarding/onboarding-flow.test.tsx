import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { refresh, saveOnboardingPreferences } = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveOnboardingPreferences: vi.fn(),
}));

vi.mock('@/lib/onboarding/actions', () => ({ saveOnboardingPreferences }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

import { defaultOnboardingState } from '@/lib/onboarding/preferences';

import { OnboardingFlow } from './onboarding-flow';
import { onboardingMessages } from '@/lib/i18n/messages/onboarding';

describe('three-step onboarding', () => {
  it('starts with five approved interface-language choices', () => {
    render(
      <OnboardingFlow
        initialState={defaultOnboardingState}
        copy={onboardingMessages.en}
      />,
    );

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
    render(
      <OnboardingFlow
        initialState={defaultOnboardingState}
        copy={onboardingMessages.en}
      />,
    );

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
        key="step-2"
        initialState={{ ...defaultOnboardingState, onboardingStep: 2 }}
        copy={onboardingMessages.en}
      />,
    );

    expect(screen.getByText('Step 2 of 3')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Output language' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeVisible();
  });

  it('renders all three onboarding steps and actions in Ukrainian', () => {
    const { rerender } = render(
      <OnboardingFlow
        initialState={defaultOnboardingState}
        copy={onboardingMessages.uk}
      />,
    );

    expect(screen.getByText('Крок 1 із 3')).toBeVisible();
    expect(screen.getByRole('status', { name: 'Крок 1 із 3' })).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(
      screen.getByRole('heading', { name: 'Мова інтерфейсу' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Виберіть мову, яка використовуватиметься в інтерфейсі Gleen.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Продовжити' })).toBeVisible();

    rerender(
      <OnboardingFlow
        key="uk-step-2"
        initialState={{ ...defaultOnboardingState, onboardingStep: 2 }}
        copy={onboardingMessages.uk}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Мова результатів' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Окремо виберіть мову за замовчуванням для створеного контенту.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Пропустити' })).toBeVisible();

    rerender(
      <OnboardingFlow
        key="step-3"
        initialState={{ ...defaultOnboardingState, onboardingStep: 3 }}
        copy={onboardingMessages.uk}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Налаштування результатів' }),
    ).toBeVisible();
    expect(screen.getByText('Збалансований конспект')).toBeVisible();
    expect(screen.getByText('Докладний конспект')).toBeVisible();
    expect(screen.getByText('18 карток')).toBeVisible();
    expect(screen.getByText('30 карток')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Завершити налаштування' }),
    ).toBeVisible();
  });

  it('keeps output locale unchanged when the interface locale changes', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OnboardingFlow
        initialState={{ ...defaultOnboardingState, outputLocale: 'uk' }}
        copy={onboardingMessages.uk}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /Deutsch/ }));

    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="interfaceLocale"]',
      ),
    ).toHaveValue('de');
    expect(
      container.querySelector<HTMLInputElement>('input[name="outputLocale"]'),
    ).toHaveValue('uk');
  });

  it('refreshes the current route after saving a new interface locale', async () => {
    const user = userEvent.setup();
    saveOnboardingPreferences.mockResolvedValueOnce({
      status: 'success',
      data: {
        ...defaultOnboardingState,
        interfaceLocale: 'de',
        onboardingStep: 2,
      },
    });
    render(
      <OnboardingFlow
        initialState={defaultOnboardingState}
        copy={onboardingMessages.en}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /Deutsch/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('localizes onboarding save failures in Ukrainian', async () => {
    const user = userEvent.setup();
    saveOnboardingPreferences.mockResolvedValueOnce({
      status: 'error',
      code: 'save_failed',
    });
    render(
      <OnboardingFlow
        initialState={defaultOnboardingState}
        copy={onboardingMessages.uk}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Продовжити' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Не вдалося зберегти налаштування. Спробуйте ще раз.',
      ),
    );
  });
});
