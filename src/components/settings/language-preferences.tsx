'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { setInterfaceLocale, type LocaleActionState } from '@/lib/i18n/actions';
import {
  localeMetadata,
  supportedLocales,
  type Locale,
} from '@/lib/i18n/locales';
import {
  settingsErrorMessage,
  type SettingsCopy,
} from '@/lib/i18n/messages/settings';
import {
  setOutputLocale,
  setSummaryMode,
  type OutputLocaleActionState,
  type SummaryModeActionState,
} from '@/lib/settings/actions';
import { summaryModeSchema, type SummaryMode } from '@/lib/summary-mode';

const interfaceInitialState: LocaleActionState = { status: 'idle' };
const outputInitialState: OutputLocaleActionState = { status: 'idle' };
const summaryInitialState: SummaryModeActionState = { status: 'idle' };

type LanguagePreferencesProps = Readonly<{
  interfaceLocale: Locale;
  outputLocale: Locale;
  summaryMode: SummaryMode;
  copy: SettingsCopy;
  unavailable?: boolean;
  summaryModeAction?: typeof setSummaryMode;
}>;

export function LanguagePreferences({
  interfaceLocale: initialInterfaceLocale,
  outputLocale: initialOutputLocale,
  summaryMode: initialSummaryMode,
  copy,
  unavailable = false,
  summaryModeAction = setSummaryMode,
}: LanguagePreferencesProps) {
  const router = useRouter();
  const [interfaceLocale, setInterfaceLocaleValue] = useState(
    initialInterfaceLocale,
  );
  const [outputLocale, setOutputLocaleValue] = useState(initialOutputLocale);
  const [summaryMode, setSummaryModeValue] = useState(initialSummaryMode);
  const [outputRevision, setOutputRevision] = useState(0);
  const [interfaceState, interfaceAction, interfacePending] = useActionState(
    async (previousState: LocaleActionState, formData: FormData) => {
      const nextState = await setInterfaceLocale(previousState, formData);
      if (nextState.status === 'success') router.refresh();
      return nextState;
    },
    interfaceInitialState,
  );
  const [outputState, outputAction, outputPending] = useActionState(
    async (previousState: OutputLocaleActionState, formData: FormData) => {
      const nextState = await setOutputLocale(previousState, formData);
      return nextState;
    },
    outputInitialState,
  );
  const [summaryState, summaryAction, summaryPending] = useActionState(
    async (previousState: SummaryModeActionState, formData: FormData) =>
      summaryModeAction(previousState, formData),
    summaryInitialState,
  );

  useEffect(() => {
    if (outputState.status !== 'success') return;

    const timeout = window.setTimeout(() => {
      setOutputLocaleValue(outputState.locale);
      setOutputRevision((value) => value + 1);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [outputState]);

  return (
    <section
      className="language-preferences"
      aria-labelledby="language-preferences-title"
    >
      <div className="page-head language-preferences__head">
        <div>
          <span className="eyebrow">{copy.page.eyebrow}</span>
          <h1 id="language-preferences-title">{copy.page.title}</h1>
          <p>{copy.page.description}</p>
        </div>
      </div>
      <div className="settings-content">
        {unavailable ? (
          <div className="settings-load-error" role="alert">
            <p>{copy.language.loadError}</p>
            <a
              className="ui-button"
              data-variant="ghost"
              href="/app/settings/profile"
            >
              {copy.language.retry}
            </a>
          </div>
        ) : null}
        <PreferenceForm
          action={interfaceAction}
          description={copy.language.interface.description}
          error={
            interfaceState.status === 'error'
              ? settingsErrorMessage(copy, interfaceState.code)
              : null
          }
          label={copy.language.interface.label}
          onChange={setInterfaceLocaleValue}
          pending={interfacePending}
          saved={
            interfaceState.status === 'success' &&
            interfaceState.locale === interfaceLocale
          }
          saveLabel={copy.language.interface.save}
          title={copy.language.interface.title}
          value={interfaceLocale}
          savingLabel={copy.language.saving}
          savedLabel={copy.language.saved}
          unavailable={unavailable}
        />
        <PreferenceForm
          action={outputAction}
          description={copy.language.output.description}
          error={
            outputState.status === 'error'
              ? settingsErrorMessage(copy, outputState.code)
              : null
          }
          label={copy.language.output.label}
          onChange={setOutputLocaleValue}
          pending={outputPending}
          revision={outputRevision}
          saved={
            outputState.status === 'success' &&
            outputState.locale === outputLocale
          }
          saveLabel={copy.language.output.save}
          title={copy.language.output.title}
          value={outputLocale}
          savingLabel={copy.language.saving}
          savedLabel={copy.language.saved}
          unavailable={unavailable}
        />
        <SummaryModePreferenceForm
          action={summaryAction}
          copy={copy}
          error={
            summaryState.status === 'error'
              ? settingsErrorMessage(copy, summaryState.code)
              : null
          }
          onChange={setSummaryModeValue}
          pending={summaryPending}
          saved={
            summaryState.status === 'success' &&
            summaryState.mode === summaryMode
          }
          unavailable={unavailable}
          value={summaryMode}
        />
      </div>
    </section>
  );
}

type SummaryModePreferenceFormProps = Readonly<{
  action: (formData: FormData) => void;
  copy: SettingsCopy;
  error: string | null;
  onChange(mode: SummaryMode): void;
  pending: boolean;
  saved: boolean;
  unavailable: boolean;
  value: SummaryMode;
}>;

function SummaryModePreferenceForm({
  action,
  copy,
  error,
  onChange,
  pending,
  saved,
  unavailable,
  value,
}: SummaryModePreferenceFormProps) {
  return (
    <form
      action={action}
      className="settings-section"
      onReset={(event) => event.preventDefault()}
    >
      <div className="settings-section-head">
        <h2>{copy.summary.title}</h2>
        <p>{copy.summary.description}</p>
      </div>
      <label className="language-preferences__field">
        <span>{copy.summary.label}</span>
        <select
          aria-label={copy.summary.label}
          disabled={unavailable || pending}
          name="summaryMode"
          onChange={(event) =>
            onChange(summaryModeSchema.parse(event.target.value))
          }
          value={value}
        >
          {summaryModeSchema.options.map((mode) => (
            <option key={mode} value={mode}>
              {copy.summary.modes[mode].title}
            </option>
          ))}
        </select>
        <span>{copy.summary.modes[value].description}</span>
      </label>
      <div className="language-preferences__actions">
        <button
          className="ui-button"
          data-variant="primary"
          disabled={unavailable || pending}
          type="submit"
        >
          {pending ? copy.language.saving : copy.summary.save}
        </button>
        <p
          aria-live="polite"
          className="language-preferences__status"
          role={error ? 'alert' : 'status'}
        >
          {error ?? (saved ? copy.language.saved : '')}
        </p>
      </div>
    </form>
  );
}

type PreferenceFormProps = Readonly<{
  action: (formData: FormData) => void;
  description: string;
  error: string | null;
  label: string;
  onChange(locale: Locale): void;
  pending: boolean;
  revision?: number;
  saved: boolean;
  saveLabel: string;
  savedLabel: string;
  savingLabel: string;
  title: string;
  unavailable: boolean;
  value: Locale;
}>;

function PreferenceForm({
  action,
  description,
  error,
  label,
  onChange,
  pending,
  revision,
  saved,
  saveLabel,
  savedLabel,
  savingLabel,
  title,
  unavailable,
  value,
}: PreferenceFormProps) {
  return (
    <form
      action={action}
      className="settings-section"
      onReset={(event) => event.preventDefault()}
    >
      <div className="settings-section-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <label className="language-preferences__field">
        <span>{label}</span>
        <select
          disabled={unavailable || pending}
          key={revision}
          name="locale"
          onChange={(event) => onChange(event.target.value as Locale)}
          value={value}
        >
          {supportedLocales.map((locale) => (
            <option key={locale} value={locale}>
              {localeMetadata[locale].nativeName}
            </option>
          ))}
        </select>
      </label>
      <div className="language-preferences__actions">
        <button
          className="ui-button"
          data-variant="primary"
          disabled={unavailable || pending}
          type="submit"
        >
          {pending ? savingLabel : saveLabel}
        </button>
        <p
          aria-live="polite"
          className="language-preferences__status"
          role={error ? 'alert' : 'status'}
        >
          {error ?? (saved ? savedLabel : '')}
        </p>
      </div>
    </form>
  );
}
