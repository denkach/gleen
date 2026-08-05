import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
    setInterfaceLocale.mockReset();
    setInterfaceLocale.mockResolvedValue({ status: 'success', locale: 'de' });
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
    const error = screen.getByText(
      copy.localeSwitcher.errors.profileUpdateFailed,
    );
    const errorPortal = error.closest('.locale-language-feedback');
    expect(errorPortal).not.toBeNull();
    expect(errorPortal?.parentElement).toBe(document.body);
    expect(screen.getByLabelText('Language: Español')).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'es-ES');
    expect(document.cookie).toContain('gleen_locale=es');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(copy.localeSwitcher.errors.invalidLocale),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Saving language…')).not.toBeInTheDocument();
  });

  it('keeps the latest locale authoritative when an older persistence attempt settles first', async () => {
    let resolveGerman!: (value: LocaleActionState) => void;
    let resolveSpanish!: (value: LocaleActionState) => void;
    setInterfaceLocale
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGerman = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSpanish = resolve;
          }),
      );
    const user = userEvent.setup();
    render(<LocaleSwitcher locale="en" copy={copy} variant="auth" />);

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('radio', { name: 'Deutsch German' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Language' })).toBeNull(),
    );
    await user.click(screen.getByRole('button', { name: /Deutsch/i }));
    await user.click(screen.getByRole('radio', { name: 'Español Spanish' }));

    expect(screen.getByLabelText('Language: Español')).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'es-ES');
    expect(document.cookie).toContain('gleen_locale=es');

    document.documentElement.lang = 'de-DE';
    document.cookie = 'gleen_locale=de; Path=/; Max-Age=31536000; SameSite=Lax';
    await act(async () => {
      resolveGerman({ status: 'success', locale: 'de' });
    });

    await waitFor(() => expect(setInterfaceLocale).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Language: Español')).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'es-ES');
    expect(document.cookie).toContain('gleen_locale=es');
    expect(
      screen.queryByText('Language changed to Deutsch'),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveSpanish({
        status: 'error',
        code: 'profile_update_failed',
      });
    });

    expect(
      await screen.findByText(copy.localeSwitcher.errors.profileUpdateFailed),
    ).toBeVisible();
    expect(screen.getByLabelText('Language: Español')).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'es-ES');
    expect(document.cookie).toContain('gleen_locale=es');
    expect(
      screen.queryByText('Language changed to Deutsch'),
    ).not.toBeInTheDocument();
  });

  it('starts the accessible 2200 ms success announcement after the panel closes', async () => {
    vi.useFakeTimers();
    let resolveAction!: (value: LocaleActionState) => void;
    setInterfaceLocale.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    const tokenCopy = {
      localeSwitcher: {
        ...copy.localeSwitcher,
        changedTemplate: 'Language changed to {language}; keep {languageName}',
      },
    };
    render(<LocaleSwitcher locale="en" copy={tokenCopy} variant="landing" />);

    fireEvent.click(screen.getByRole('button', { name: /English/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'Deutsch German' }));
    await act(async () => Promise.resolve());
    expect(setInterfaceLocale).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAction({ status: 'success', locale: 'de' });
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { hidden: true }),
    ).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(209));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Language changed to Deutsch; keep {languageName}',
    );
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'open');
    const toastPortal = screen
      .getByRole('status')
      .closest('.locale-language-feedback');
    expect(toastPortal).not.toBeNull();
    expect(toastPortal?.parentElement).toBe(document.body);
    act(() => vi.advanceTimersByTime(2199));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'open');
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'closed');
    act(() => vi.advanceTimersByTime(239));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
