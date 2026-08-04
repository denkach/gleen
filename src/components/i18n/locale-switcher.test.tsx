import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocaleActionState } from '@/lib/i18n/actions';

const { push, refresh, replace, setInterfaceLocale } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  setInterfaceLocale: vi.fn(async (): Promise<LocaleActionState> => ({
    status: 'success',
    locale: 'de',
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push, replace }),
}));
vi.mock('@/lib/i18n/actions', () => ({ setInterfaceLocale }));

import { LocaleSwitcher } from './locale-switcher';

const copy = {
  localeSwitcher: {
    label: 'Language',
    panelTitle: 'Language',
    panelDescription: 'Choose your interface language',
    close: 'Close language selector',
    selected: 'Selected',
    quickSwitch: 'Quick switch',
    changedTemplate: 'Language changed to {language}',
    errors: {
      invalidLocale: 'Choose a supported language.',
      profileUpdateFailed:
        'Your language was changed on this device, but could not be synchronized with your profile. Try again.',
    },
  },
};

function expireLocaleCookie() {
  document.cookie = 'gleen_locale=; Path=/; Max-Age=0';
}

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.lang = 'en-GB';
    expireLocaleCookie();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    expireLocaleCookie();
  });

  it('opens the shared panel with five canonically ordered radios', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher locale="en" copy={copy} variant="landing" />);

    const trigger = screen.getByRole('button', { name: 'Language: English' });
    expect(trigger).toHaveTextContent('English');
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Language' });
    expect(
      within(dialog)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label')),
    ).toEqual([
      'Українська Ukrainian',
      'Русский Russian',
      'English English',
      'Español Spanish',
      'Deutsch German',
    ]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Saving language…')).not.toBeInTheDocument();
  });

  it('keeps the compact trigger globe decorative and its native label accessible', () => {
    render(<LocaleSwitcher compact locale="uk" copy={copy} variant="app" />);

    const trigger = screen.getByRole('button', {
      name: 'Language: Українська',
    });
    expect(trigger).toHaveClass('locale-switcher__trigger--compact');
    expect(trigger.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(trigger).not.toHaveTextContent('Українська');
  });

  it('updates local state and refreshes before profile synchronization resolves', async () => {
    let resolveAction!: (value: LocaleActionState) => void;
    setInterfaceLocale.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit');
    const user = userEvent.setup();
    render(<LocaleSwitcher locale="en" copy={copy} variant="auth" />);

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('radio', { name: 'Deutsch German' }));

    expect(screen.getByLabelText('Language: Deutsch')).toBeVisible();
    expect(
      screen.getByRole('radio', { name: 'Deutsch German' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).toHaveAttribute('lang', 'de-DE');
    expect(document.cookie).toContain('gleen_locale=de');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Saving language…')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Language changed to Deutsch'),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveAction({ status: 'success', locale: 'de' });
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps the optimistic language and shows only the synchronization error on profile failure', async () => {
    setInterfaceLocale.mockResolvedValueOnce({
      status: 'error',
      code: 'profile_update_failed',
    });
    const user = userEvent.setup();
    render(<LocaleSwitcher locale="en" copy={copy} variant="auth" />);

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('radio', { name: 'Español Spanish' }));

    await waitFor(() => expect(setInterfaceLocale).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByText(copy.localeSwitcher.errors.profileUpdateFailed),
      ).toBeVisible(),
    );
    expect(screen.getByLabelText('Language: Español')).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'es-ES');
    expect(document.cookie).toContain('gleen_locale=es');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(copy.localeSwitcher.errors.invalidLocale),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Saving language…')).not.toBeInTheDocument();
  });

  it('announces success after synchronization and dismisses it after 2200 ms', async () => {
    let resolveAction!: (value: LocaleActionState) => void;
    setInterfaceLocale.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    const user = userEvent.setup();
    const tokenCopy = {
      localeSwitcher: {
        ...copy.localeSwitcher,
        changedTemplate: 'Language changed to {language}; keep {languageName}',
      },
    };
    render(<LocaleSwitcher locale="en" copy={tokenCopy} variant="landing" />);

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('radio', { name: 'Deutsch German' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await waitFor(() => expect(setInterfaceLocale).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();

    await act(async () => {
      resolveAction({ status: 'success', locale: 'de' });
    });

    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
      'Language changed to Deutsch; keep {languageName}',
    );
    act(() => vi.advanceTimersByTime(2199));
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.queryByRole('status', { hidden: true }),
    ).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
