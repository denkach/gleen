'use client';

import { useActionState } from 'react';

import { setInterfaceLocale, type LocaleActionState } from '@/lib/i18n/actions';
import {
  supportedLocales,
  localeMetadata,
  type Locale,
} from '@/lib/i18n/locales';

const initialState: LocaleActionState = { status: 'idle' };

export function FooterLanguages({
  locale,
  label,
  error,
}: Readonly<{ locale: Locale; label: string; error: string }>) {
  const [state, action, pending] = useActionState(
    setInterfaceLocale,
    initialState,
  );
  return (
    <form action={action} aria-label={label} className="footer-links">
      {supportedLocales.map((candidate) => (
        <button
          key={candidate}
          type="submit"
          name="locale"
          value={candidate}
          lang={localeMetadata[candidate].bcp47}
          aria-pressed={candidate === locale}
          disabled={pending}
        >
          {localeMetadata[candidate].nativeName}
        </button>
      ))}
      {state.status === 'error' && <p role="alert">{error}</p>}
    </form>
  );
}
