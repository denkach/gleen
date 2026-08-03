'use client';

import { useActionState, useState } from 'react';
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
  type OutputLocaleActionState,
} from '@/lib/settings/actions';

const interfaceInitialState: LocaleActionState = { status: 'idle' };
const outputInitialState: OutputLocaleActionState = { status: 'idle' };

type LanguagePreferencesProps = Readonly<{
  interfaceLocale: Locale;
  outputLocale: Locale;
  copy: SettingsCopy;
}>;

export function LanguagePreferences({
  interfaceLocale: initialInterfaceLocale,
  outputLocale: initialOutputLocale,
  copy,
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
      if (nextState.status === 'success') {
        setOutputLocaleValue(nextState.locale);
        window.setTimeout(() => setOutputRevision((value) => value + 1), 0);
      }
      return nextState;
    },
    outputInitialState,
  );

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
          saved={interfaceState.status === 'success'}
          saveLabel={copy.language.interface.save}
          title={copy.language.interface.title}
          value={interfaceLocale}
          savingLabel={copy.language.saving}
          savedLabel={copy.language.saved}
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
          saved={outputState.status === 'success'}
          saveLabel={copy.language.output.save}
          title={copy.language.output.title}
          value={outputLocale}
          savingLabel={copy.language.saving}
          savedLabel={copy.language.saved}
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
          disabled={pending}
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
          disabled={pending}
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
