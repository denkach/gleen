'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const successToastExitDuration = 240;

type OptimisticLocale = Readonly<{
  baseLocale: Locale;
  selectedLocale: Locale;
}>;

export function LocaleSwitcher({
  compact = false,
  locale,
  copy,
  variant,
}: LocaleSwitcherProps) {
  const formId = useId();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const attemptRef = useRef<HTMLInputElement>(null);
  const submitterRefs = useRef<Partial<Record<Locale, HTMLButtonElement>>>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const latestSelectionRef = useRef({ attempt: 0, locale });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [optimisticLocale, setOptimisticLocale] = useState<OptimisticLocale>({
    baseLocale: locale,
    selectedLocale: locale,
  });
  const [dismissedSuccess, setDismissedSuccess] =
    useState<LocaleActionState | null>(null);
  const [exitingSuccess, setExitingSuccess] =
    useState<LocaleActionState | null>(null);
  const [state, formAction] = useActionState(
    async (previousState: LocaleActionState, formData: FormData) => {
      const attempt = formData.get('localeAttempt');
      const result = await setInterfaceLocale(previousState, formData);
      const latestSelection = latestSelectionRef.current;

      document.documentElement.lang = toBcp47(latestSelection.locale);
      writeBrowserLocaleCookie(latestSelection.locale);

      return attempt === String(latestSelection.attempt)
        ? result
        : previousState;
    },
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
    if (state.status !== 'success' || panelOpen) return;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setExitingSuccess(state);
      toastExitTimerRef.current = setTimeout(() => {
        toastExitTimerRef.current = null;
        setDismissedSuccess(state);
        setExitingSuccess(null);
      }, successToastExitDuration);
    }, successToastDuration);

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);
    };
  }, [panelOpen, state]);

  function selectLocale(candidate: Locale) {
    const parsed = localeSchema.safeParse(candidate);
    if (!parsed.success) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (toastExitTimerRef.current) {
      clearTimeout(toastExitTimerRef.current);
      toastExitTimerRef.current = null;
    }
    setDismissedSuccess(state);
    setExitingSuccess(null);
    const attempt = latestSelectionRef.current.attempt + 1;
    latestSelectionRef.current = { attempt, locale: parsed.data };
    if (attemptRef.current) attemptRef.current.value = String(attempt);
    setOptimisticLocale({
      baseLocale: locale,
      selectedLocale: parsed.data,
    });
    document.documentElement.lang = toBcp47(parsed.data);
    writeBrowserLocaleCookie(parsed.data);
    router.refresh();

    const submitter = submitterRefs.current[parsed.data];
    if (submitter) formRef.current?.requestSubmit(submitter);
  }

  if (optimisticLocale.baseLocale !== locale) {
    setOptimisticLocale({
      baseLocale: locale,
      selectedLocale: locale,
    });
  }

  const selectedLocale =
    optimisticLocale.baseLocale === locale
      ? optimisticLocale.selectedLocale
      : locale;
  const error =
    state.status === 'error'
      ? state.code === 'invalid_locale'
        ? copy.localeSwitcher.errors.invalidLocale
        : copy.localeSwitcher.errors.profileUpdateFailed
      : null;
  const selectedMetadata = localeMetadata[selectedLocale];
  const toastMessage =
    state.status === 'success' && !panelOpen && dismissedSuccess !== state
      ? copy.localeSwitcher.changedTemplate.replace(
          '{language}',
          localeMetadata[state.locale].nativeName,
        )
      : null;
  const feedback =
    error && !panelOpen ? (
      <p aria-live="polite" className="locale-switcher__status">
        {error}
      </p>
    ) : toastMessage ? (
      <div
        aria-live="polite"
        className="locale-language-toast"
        data-state={exitingSuccess === state ? 'closed' : 'open'}
        role="status"
      >
        <span aria-hidden="true" className="locale-language-toast__icon">
          ✓
        </span>
        <span className="locale-language-toast__message">{toastMessage}</span>
      </div>
    ) : null;
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
    <>
      <form
        action={formAction}
        id={formId}
        className="locale-switcher"
        ref={formRef}
      >
        <input
          defaultValue="0"
          name="localeAttempt"
          ref={attemptRef}
          type="hidden"
        />
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
      </form>
      {feedback && typeof document !== 'undefined'
        ? createPortal(
            <div className="locale-language-feedback" data-variant={variant}>
              {feedback}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
