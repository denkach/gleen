import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { push, refresh, replace, setInterfaceLocale } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  setInterfaceLocale: vi.fn(async () => ({ status: 'success', locale: 'de' })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push, replace }),
}));
vi.mock('@/lib/i18n/actions', () => ({ setInterfaceLocale }));

import { LocaleSwitcher } from './locale-switcher';

const copy = {
  localeSwitcher: {
    label: 'Language',
    menuLabel: 'Choose interface language',
    saving: 'Saving language…',
    errors: {
      invalidLocale: 'Choose a supported language.',
      profileUpdateFailed: 'We could not save your language. Try again.',
    },
  },
};

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.lang = 'en-GB';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses native language names and exposes the selected locale', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher locale="en" copy={copy} variant="landing" />);

    await user.click(screen.getByRole('button', { name: /English/i }));

    expect(screen.getByRole('menuitem', { name: 'English' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Українська' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Русский' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Español' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Deutsch' })).toBeVisible();
  });

  it('refreshes without changing the current route after a successful selection', async () => {
    const user = userEvent.setup();
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit');
    render(<LocaleSwitcher locale="en" copy={copy} variant="auth" />);

    await user.click(screen.getByRole('button', { name: /English/i }));
    const germanOption = screen.getByRole('menuitem', { name: 'Deutsch' });
    await user.click(germanOption);

    expect(requestSubmit).toHaveBeenCalledWith(germanOption);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(document.documentElement).toHaveAttribute('lang', 'de-DE');
    expect(setInterfaceLocale).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('closes the modal menu before a locale save enters its pending state', async () => {
    let resolveAction!: (value: { status: 'success'; locale: 'de' }) => void;
    setInterfaceLocale.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<LocaleSwitcher locale="en" copy={copy} variant="auth" />);

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Deutsch' }));

    await waitFor(() => expect(setInterfaceLocale).toHaveBeenCalled());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    resolveAction({ status: 'success', locale: 'de' });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
});
