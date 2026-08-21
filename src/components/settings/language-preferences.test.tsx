import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh, setInterfaceLocale, setOutputLocale } = vi.hoisted(() => ({
  refresh: vi.fn(),
  setInterfaceLocale: vi.fn(),
  setOutputLocale: vi.fn(),
}));

vi.mock('@/lib/i18n/actions', () => ({ setInterfaceLocale }));
vi.mock('@/lib/settings/actions', () => ({ setOutputLocale }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { settingsMessages } from '@/lib/i18n/messages/settings';

import { LanguagePreferences } from './language-preferences';

describe('language preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the approved account hierarchy and keeps stable per-form status regions', () => {
    render(
      <LanguagePreferences
        interfaceLocale="en"
        outputLocale="uk"
        copy={settingsMessages.en}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Interface language', level: 2 }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'Generated-content language',
        level: 2,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'Settings apply only to new materials',
        level: 2,
      }),
    ).toBeVisible();
    expect(
      screen.getByText('Previous analyses and documents remain unchanged.'),
    ).toBeVisible();
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('keeps the normal save label while only the submitted language is pending', async () => {
    const user = userEvent.setup();
    let resolveSave:
      ((value: { status: 'success'; locale: 'de' }) => void) | null = null;
    setInterfaceLocale.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(
      <LanguagePreferences
        interfaceLocale="en"
        outputLocale="uk"
        copy={settingsMessages.en}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText('Gleen controls language'),
      'de',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save interface language' }),
    );

    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save interface language' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save output language' }),
    ).toBeEnabled();

    await act(async () => {
      resolveSave?.({ status: 'success', locale: 'de' });
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save interface language' }),
      ).toBeEnabled(),
    );
  });

  it('keeps the generated-content selection unchanged when saving interface language', async () => {
    const user = userEvent.setup();
    setInterfaceLocale.mockResolvedValue({ status: 'success', locale: 'de' });
    render(
      <LanguagePreferences
        interfaceLocale="en"
        outputLocale="uk"
        copy={settingsMessages.en}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText('Gleen controls language'),
      'de',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save interface language' }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(
      screen.getByLabelText('Future generated content language'),
    ).toHaveValue('uk');
  });

  it('updates only the generated-content selection without refreshing the interface', async () => {
    const user = userEvent.setup();
    setOutputLocale.mockResolvedValue({ status: 'success', locale: 'es' });
    render(
      <LanguagePreferences
        interfaceLocale="de"
        outputLocale="uk"
        copy={settingsMessages.en}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText('Future generated content language'),
      'es',
    );
    expect(
      screen.getByLabelText('Future generated content language'),
    ).toHaveValue('es');
    await user.click(
      screen.getByRole('button', { name: 'Save output language' }),
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText('Future generated content language'),
      ).toHaveValue('es'),
    );
    expect(screen.getByLabelText('Gleen controls language')).toHaveValue('de');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('clears an output save confirmation after the selection changes again', async () => {
    const user = userEvent.setup();
    setOutputLocale.mockResolvedValue({ status: 'success', locale: 'es' });
    render(
      <LanguagePreferences
        interfaceLocale="en"
        outputLocale="uk"
        copy={settingsMessages.en}
      />,
    );
    const outputSelect = screen.getByLabelText(
      'Future generated content language',
    );

    await user.selectOptions(outputSelect, 'es');
    await user.click(
      screen.getByRole('button', { name: 'Save output language' }),
    );
    await waitFor(() => expect(screen.getByText('Saved.')).toBeVisible());
    await waitFor(() =>
      expect(
        screen.getByLabelText('Future generated content language'),
      ).not.toBe(outputSelect),
    );

    await user.selectOptions(
      screen.getByLabelText('Future generated content language'),
      'de',
    );

    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });

  it('keeps each language selector keyboard reachable and reports only its own save failure', async () => {
    const user = userEvent.setup();
    setOutputLocale.mockResolvedValue({
      status: 'error',
      code: 'profile_update_failed',
    });
    render(
      <LanguagePreferences
        interfaceLocale="en"
        outputLocale="uk"
        copy={settingsMessages.en}
      />,
    );

    await user.tab();
    expect(screen.getByLabelText('Gleen controls language')).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(10);
    expect(screen.getAllByRole('option', { name: 'English' })).toHaveLength(2);

    await user.tab();
    await user.tab();
    await user.selectOptions(
      screen.getByLabelText('Future generated content language'),
      'es',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save output language' }),
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'We could not save this language. Try again.',
      ),
    );
    expect(screen.getByLabelText('Gleen controls language')).toHaveValue('en');
  });
});
