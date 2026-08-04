'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';

import { setInterfaceLocale, type LocaleActionState } from '@/lib/i18n/actions';
import type { Locale } from '@/lib/i18n/locales';
import { localeMetadata, supportedLocales, toBcp47 } from '@/lib/i18n/locales';
import type { LocaleSwitcherCopy } from '@/lib/i18n/messages/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type LocaleSwitcherProps = Readonly<{
  compact?: boolean;
  locale: Locale;
  copy: LocaleSwitcherCopy;
  variant: 'landing' | 'auth' | 'app';
}>;

const initialActionState: LocaleActionState = { status: 'idle' };

export function LocaleSwitcher({
  compact = false,
  locale,
  copy,
  variant,
}: LocaleSwitcherProps) {
  const formId = useId();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    setInterfaceLocale,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === 'success') {
      document.documentElement.lang = toBcp47(state.locale);
      router.refresh();
    }
  }, [router, state]);

  const error =
    state.status === 'error'
      ? state.code === 'invalid_locale'
        ? copy.localeSwitcher.errors.invalidLocale
        : copy.localeSwitcher.errors.profileUpdateFailed
      : null;

  return (
    <form action={formAction} id={formId} className="locale-switcher">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`${copy.localeSwitcher.label}: ${localeMetadata[locale].nativeName}`}
            className={`btn btn-ghost btn-sm language-btn locale-switcher__trigger locale-switcher__trigger--${variant}${compact ? ' locale-switcher__trigger--compact' : ''}`}
            disabled={pending}
            type="button"
          >
            {compact ? (
              <svg
                aria-hidden="true"
                className="locale-switcher__compact-icon"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="8.5" />
                <path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5Z" />
              </svg>
            ) : (
              <>
                {localeMetadata[locale].nativeName}{' '}
                <span aria-hidden="true">›</span>
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          aria-label={copy.localeSwitcher.panelDescription}
          className={`locale-switcher__menu locale-switcher__menu--${variant}`}
          align="end"
        >
          {supportedLocales.map((candidate) => (
            <DropdownMenuItem asChild key={candidate}>
              <button
                aria-current={candidate === locale ? 'true' : undefined}
                className="locale-switcher__item"
                disabled={pending}
                form={formId}
                name="locale"
                onClick={(event) => {
                  event.preventDefault();
                  setMenuOpen(false);
                  event.currentTarget.form?.requestSubmit(event.currentTarget);
                }}
                type="submit"
                value={candidate}
              >
                {localeMetadata[candidate].nativeName}
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p aria-live="polite" className="locale-switcher__status">
          {error}
        </p>
      ) : null}
    </form>
  );
}
