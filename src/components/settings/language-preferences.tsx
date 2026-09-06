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
  type SettingsClientCopy,
} from '@/lib/i18n/messages/settings';
import {
  setOutputLocale,
  type OutputLocaleActionState,
} from '@/lib/settings/actions';

import { SettingsPanel, SettingsSaveIcon } from './settings-panel';

const interfaceInitialState: LocaleActionState = { status: 'idle' };
const outputInitialState: OutputLocaleActionState = { status: 'idle' };

type LanguagePreferencesProps = Readonly<{
  interfaceLocale: Locale;
  outputLocale: Locale;
  copy: SettingsClientCopy;
  unavailable?: boolean;
}>;

export function LanguagePreferences({
  interfaceLocale: initialInterfaceLocale,
  outputLocale: initialOutputLocale,
  copy,
  unavailable = false,
}: LanguagePreferencesProps) {
  const router = useRouter();
  const [interfaceLocale, setInterfaceLocaleValue] = useState(
    initialInterfaceLocale,
  );
  const [outputLocale, setOutputLocaleValue] = useState(initialOutputLocale);
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
      className="language-preferences settings-page"
      aria-labelledby="language-preferences-title"
    >
      <div className="page-head settings-page-head language-preferences__head">
        <div>
          <span className="eyebrow">{copy.page.title}</span>
          <h1 id="language-preferences-title">{copy.language.title}</h1>
          <p>{copy.page.description}</p>
        </div>
      </div>
      <div className="settings-panel-stack">
        {unavailable ? (
          <div className="settings-load-error" role="alert">
            <p>{copy.language.loadError}</p>
            <a
              className="ui-button"
              data-variant="ghost"
              href="/app/settings/language"
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
      </div>
    </section>
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
    <SettingsPanel description={description} icon="language" title={title}>
      <form
        action={action}
        className="settings-form"
        onReset={(event) => event.preventDefault()}
      >
        <label className="settings-field">
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
        <div className="settings-form-actions">
          <p
            aria-live="polite"
            className="language-preferences__status"
            role={error ? 'alert' : 'status'}
          >
            {error ?? (saved ? savedLabel : '')}
          </p>
          <button
            className="ui-button settings-primary-button"
            data-variant="primary"
            disabled={unavailable || pending}
            type="submit"
          >
            <SettingsSaveIcon />
            <span>{pending ? savingLabel : saveLabel}</span>
          </button>
        </div>
      </form>
    </SettingsPanel>
  );
}
