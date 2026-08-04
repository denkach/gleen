import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/lib/i18n/locales';
import type { LocaleSwitcherCopy } from '@/lib/i18n/messages/shared';

import { LanguagePanel } from './language-panel';

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
      profileUpdateFailed: 'Could not synchronize your language.',
    },
  },
} satisfies LocaleSwitcherCopy;

afterEach(() => {
  vi.useRealTimers();
});

function ControlledPanel({
  initialOpen = false,
  locale = 'en',
  onSelect = vi.fn(),
}: {
  initialOpen?: boolean;
  locale?: Locale;
  onSelect?: (locale: Locale) => void;
}) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <LanguagePanel
      copy={copy}
      locale={locale}
      onSelect={onSelect}
      open={open}
      onOpenChange={setOpen}
      trigger={<button type="button">English</button>}
      variant="landing"
    />
  );
}

describe('LanguagePanel', () => {
  it.each([
    ['MacIntel', '⌘ K'],
    ['Win32', 'Ctrl K'],
    ['Linux x86_64', 'Ctrl K'],
  ])('shows the %s platform shortcut as %s', (platform, shortcut) => {
    render(
      <LanguagePanel
        copy={copy}
        locale="en"
        onSelect={vi.fn()}
        open
        onOpenChange={vi.fn()}
        platform={platform}
        trigger={<button type="button">English</button>}
        variant="landing"
      />,
    );

    expect(screen.getByText(shortcut, { selector: 'kbd' })).toBeVisible();
  });

  it('exposes the five ordered languages as radios and focuses the selection', async () => {
    render(<ControlledPanel initialOpen />);

    const dialog = screen.getByRole('dialog', { name: 'Language' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('Choose your interface language')).toBeVisible();

    const radios = within(dialog).getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Українська Ukrainian',
      'Русский Russian',
      'English English',
      'Español Spanish',
      'Deutsch German',
    ]);
    expect(
      screen.getByRole('radio', { name: 'English English' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('radio', { name: 'Українська Ukrainian' }),
    ).not.toHaveAccessibleName(/Selected/);
    expect(within(dialog).getByText('Selected')).toBeVisible();
    expect(
      screen.getByRole('radio', { name: 'English English' }),
    ).toHaveFocus();
  });

  it('moves focus with wrapping arrows and Home and End', () => {
    render(<ControlledPanel initialOpen locale="uk" />);

    const ukrainian = screen.getByRole('radio', {
      name: 'Українська Ukrainian',
    });
    fireEvent.keyDown(ukrainian, { key: 'ArrowUp' });
    expect(screen.getByRole('radio', { name: 'Deutsch German' })).toHaveFocus();

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(ukrainian).toHaveFocus();

    fireEvent.keyDown(ukrainian, { key: 'End' });
    expect(screen.getByRole('radio', { name: 'Deutsch German' })).toHaveFocus();

    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(ukrainian).toHaveFocus();
  });

  it.each(['Enter', ' '] as const)(
    'selects the focused locale with %s and closes after 210 ms',
    (key) => {
      vi.useFakeTimers();
      const onOpenChange = vi.fn();
      const onSelect = vi.fn();
      render(
        <LanguagePanel
          copy={copy}
          locale="en"
          onSelect={onSelect}
          open
          onOpenChange={onOpenChange}
          trigger={<button type="button">English</button>}
          variant="landing"
        />,
      );

      const english = screen.getByRole('radio', { name: 'English English' });
      fireEvent.keyDown(english, { key: 'End' });
      fireEvent.keyDown(document.activeElement!, { key });

      expect(onSelect).toHaveBeenCalledWith('de');
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      act(() => vi.advanceTimersByTime(209));
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      act(() => vi.advanceTimersByTime(1));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    },
  );

  it('closes from Escape and the scrim', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <LanguagePanel
        copy={copy}
        locale="en"
        onSelect={vi.fn()}
        open
        onOpenChange={onOpenChange}
        trigger={<button type="button">English</button>}
        variant="auth"
      />,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    rerender(
      <LanguagePanel
        copy={copy}
        locale="en"
        onSelect={vi.fn()}
        open
        onOpenChange={onOpenChange}
        trigger={<button type="button">English</button>}
        variant="auth"
      />,
    );
    await userEvent
      .setup()
      .click(document.querySelector('.locale-language-panel__scrim')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('contains Tab focus and restores it to the trigger after closing', async () => {
    const user = userEvent.setup();
    render(<ControlledPanel />);
    const trigger = screen.getByRole('button', { name: 'English' });

    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Language' });
    expect(
      screen.getByRole('radio', { name: 'English English' }),
    ).toHaveFocus();

    for (let index = 0; index < 8; index += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
