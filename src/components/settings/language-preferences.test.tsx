import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh, setInterfaceLocale, setOutputLocale, setSummaryMode } =
  vi.hoisted(() => ({
    refresh: vi.fn(),
    setInterfaceLocale: vi.fn(),
    setOutputLocale: vi.fn(),
    setSummaryMode: vi.fn(),
  }));

vi.mock('@/lib/i18n/actions', () => ({ setInterfaceLocale }));
vi.mock('@/lib/settings/actions', () => ({ setOutputLocale, setSummaryMode }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { settingsMessages } from '@/lib/i18n/messages/settings';

import { LanguagePreferences } from './language-preferences';

describe('language preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the generated-content selection unchanged when saving interface language', async () => {
    const user = userEvent.setup();
    setInterfaceLocale.mockResolvedValue({ status: 'success', locale: 'de' });
    render(
      <LanguagePreferences
        interfaceLocale="en"
        outputLocale="uk"
        summaryMode="balanced"
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
        summaryMode="balanced"
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
        summaryMode="balanced"
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
        summaryMode="balanced"
        copy={settingsMessages.en}
      />,
    );

    await user.tab();
    expect(screen.getByLabelText('Gleen controls language')).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(13);
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

  it('saves Compact as the canonical account summary default', async () => {
    const user = userEvent.setup();
    setSummaryMode.mockResolvedValue({ status: 'success', mode: 'compact' });
    render(
      <LanguagePreferences
        interfaceLocale="en"
        outputLocale="uk"
        summaryMode="balanced"
        copy={settingsMessages.en}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText('Default summary mode'),
      'compact',
    );
    expect(
      screen.getByText(
        'The shortest useful version with the main conclusions and important caveats.',
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Save summary mode' }));

    await waitFor(() =>
      expect(setSummaryMode).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(FormData),
      ),
    );
    const formData = setSummaryMode.mock.calls[0]?.[1] as FormData;
    expect(formData.get('summaryMode')).toBe('compact');
    expect(screen.getByLabelText('Default summary mode')).toHaveValue(
      'compact',
    );
  });
});
