'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppIcon } from '@/components/app-shell/app-icon';
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
  type OutputLocaleActionState,
} from '@/lib/settings/actions';

const interfaceInitialState: LocaleActionState = { status: 'idle' };
const outputInitialState: OutputLocaleActionState = { status: 'idle' };

type LanguagePreferencesProps = Readonly<{
  interfaceLocale: Locale;
  outputLocale: Locale;
  copy: SettingsCopy;
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
      <div className="settings-account-layout">
        <div className="settings-language-column">
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
          <article className="settings-language-card">
            <PreferenceForm
              action={interfaceAction}
              description={copy.language.interface.description}
              error={
                interfaceState.status === 'error'
                  ? settingsErrorMessage(copy, interfaceState.code)
                  : null
              }
              icon="globe"
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
              icon="content-language"
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
              savedLabel={copy.language.saved}
              unavailable={unavailable}
            />
          </article>
        </div>
        <aside className="settings-note-card">
          <span className="settings-note-card__icon">
            <AppIcon name="check" />
          </span>
          <div className="settings-note-card__copy">
            <h2>{copy.language.note.title}</h2>
            <p>{copy.language.note.description}</p>
          </div>
          <div className="settings-note-card__privacy">
            <AppIcon name="lock" />
            <span>{copy.language.note.privacy}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

type PreferenceFormProps = Readonly<{
  action: (formData: FormData) => void;
  description: string;
  error: string | null;
  icon: 'content-language' | 'globe';
  label: string;
  onChange(locale: Locale): void;
  pending: boolean;
  revision?: number;
  saved: boolean;
  saveLabel: string;
  savedLabel: string;
  title: string;
  unavailable: boolean;
  value: Locale;
}>;

function PreferenceForm({
  action,
  description,
  error,
  icon,
  label,
  onChange,
  pending,
  revision,
  saved,
  saveLabel,
  savedLabel,
  title,
  unavailable,
  value,
}: PreferenceFormProps) {
  return (
    <form
      action={action}
      aria-busy={pending}
      className="settings-preference-row"
      onReset={(event) => event.preventDefault()}
    >
      <div className="settings-preference-copy">
        <span className="settings-preference-icon">
          <AppIcon name={icon} />
        </span>
        <div className="settings-section-head">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-preference-control">
        <label className="language-preferences__field">
          <span className="app-visually-hidden">{label}</span>
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
        <p
          aria-live="polite"
          className="language-preferences__status"
          role={error ? 'alert' : 'status'}
        >
          {error ?? (saved ? savedLabel : '')}
        </p>
      </div>
      <button
        className="ui-button settings-preference-save"
        data-variant="primary"
        disabled={unavailable || pending}
        type="submit"
      >
        {saveLabel}
      </button>
    </form>
  );
}
