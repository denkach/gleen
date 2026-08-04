'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { LanguagePanel } from '@/components/i18n/language-panel';
import { setInterfaceLocale, type LocaleActionState } from '@/lib/i18n/actions';
import { writeBrowserLocaleCookie } from '@/lib/i18n/browser-locale-cookie';
import {
  localeMetadata,
  localeSchema,
  supportedLocales,
  toBcp47,
  type Locale,
} from '@/lib/i18n/locales';
import type { LocaleSwitcherCopy } from '@/lib/i18n/messages/shared';

type LocaleSwitcherProps = Readonly<{
  compact?: boolean;
  locale: Locale;
  copy: LocaleSwitcherCopy;
  variant: 'landing' | 'auth' | 'app';
}>;

const initialActionState: LocaleActionState = { status: 'idle' };
const successToastDuration = 2200;

export function LocaleSwitcher({
  compact = false,
  locale,
  copy,
  variant,
}: LocaleSwitcherProps) {
  const formId = useId();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitterRefs = useRef<Partial<Record<Locale, HTMLButtonElement>>>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [dismissedSuccess, setDismissedSuccess] =
    useState<LocaleActionState | null>(null);
  const [state, formAction] = useActionState(
    setInterfaceLocale,
    initialActionState,
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey) ||
        triggerRef.current === null ||
        triggerRef.current.getClientRects().length === 0
      ) {
        return;
      }

      event.preventDefault();
      setPanelOpen((open) => !open);
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (state.status !== 'success') return;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setDismissedSuccess(state);
    }, successToastDuration);

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [state]);

  function selectLocale(candidate: Locale) {
    const parsed = localeSchema.safeParse(candidate);
    if (!parsed.success) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setDismissedSuccess(state);
    setSelectedLocale(parsed.data);
    document.documentElement.lang = toBcp47(parsed.data);
    writeBrowserLocaleCookie(parsed.data);
    router.refresh();

    const submitter = submitterRefs.current[parsed.data];
    if (submitter) formRef.current?.requestSubmit(submitter);
  }

  const error =
    state.status === 'error'
      ? state.code === 'invalid_locale'
        ? copy.localeSwitcher.errors.invalidLocale
        : copy.localeSwitcher.errors.profileUpdateFailed
      : null;
  const selectedMetadata = localeMetadata[selectedLocale];
  const toastMessage =
    state.status === 'success' && dismissedSuccess !== state
      ? copy.localeSwitcher.changedTemplate.replace(
          '{language}',
          localeMetadata[state.locale].nativeName,
        )
      : null;
  const trigger = (
    <button
      aria-label={`${copy.localeSwitcher.label}: ${selectedMetadata.nativeName}`}
      className={`btn btn-ghost btn-sm language-btn locale-switcher__trigger locale-switcher__trigger--${variant}${compact ? ' locale-switcher__trigger--compact' : ''}`}
      ref={triggerRef}
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
          {selectedMetadata.nativeName}{' '}
          <span aria-hidden="true" className="locale-switcher__chevron">
            ›
          </span>
        </>
      )}
    </button>
  );

  return (
    <form
      action={formAction}
      id={formId}
      className="locale-switcher"
      ref={formRef}
    >
      <LanguagePanel
        copy={copy}
        locale={selectedLocale}
        onSelect={selectLocale}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        trigger={trigger}
        variant={variant}
      />
      {supportedLocales.map((candidate) => (
        <button
          aria-hidden="true"
          hidden
          key={candidate}
          name="locale"
          ref={(node) => {
            if (node) submitterRefs.current[candidate] = node;
            else delete submitterRefs.current[candidate];
          }}
          tabIndex={-1}
          type="submit"
          value={candidate}
        />
      ))}
      {error ? (
        <p aria-live="polite" className="locale-switcher__status">
          {error}
        </p>
      ) : null}
      {toastMessage ? (
        <div aria-live="polite" className="locale-language-toast" role="status">
          <span aria-hidden="true" className="locale-language-toast__icon">
            ✓
          </span>
          <span className="locale-language-toast__message">{toastMessage}</span>
        </div>
      ) : null}
    </form>
  );
}
