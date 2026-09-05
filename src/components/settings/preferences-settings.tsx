'use client';

import { useActionState, useState } from 'react';

import {
  settingsErrorMessage,
  type SettingsClientCopy,
} from '@/lib/i18n/messages/settings';
import {
  setFlashcardPreset,
  setSummaryMode,
  type FlashcardPresetActionState,
  type SummaryModeActionState,
} from '@/lib/settings/actions';
import type { OnboardingState } from '@/lib/onboarding/preferences';
import { summaryModeSchema, type SummaryMode } from '@/lib/summary-mode';

const summaryInitial: SummaryModeActionState = { status: 'idle' };
const cardsInitial: FlashcardPresetActionState = { status: 'idle' };

type PreferencesSettingsProps = Readonly<{
  copy: SettingsClientCopy;
  flashcardPreset: OnboardingState['flashcardPreset'];
  summaryMode: SummaryMode;
  unavailable?: boolean;
  summaryModeAction?: (
    state: SummaryModeActionState,
    formData: FormData,
  ) => Promise<SummaryModeActionState>;
  flashcardPresetAction?: (
    state: FlashcardPresetActionState,
    formData: FormData,
  ) => Promise<FlashcardPresetActionState>;
}>;

export function PreferencesSettings({
  copy,
  flashcardPreset,
  summaryMode,
  unavailable = false,
  summaryModeAction = setSummaryMode,
  flashcardPresetAction = setFlashcardPreset,
}: PreferencesSettingsProps) {
  const [mode, setMode] = useState(summaryMode);
  const [cards, setCards] = useState(flashcardPreset);
  const [summaryState, summaryAction, summaryPending] = useActionState(
    summaryModeAction,
    summaryInitial,
  );
  const [cardsState, cardsAction, cardsPending] = useActionState(
    flashcardPresetAction,
    cardsInitial,
  );
  const summaryError =
    summaryState.status === 'error'
      ? settingsErrorMessage(copy, summaryState.code)
      : '';
  const cardsError =
    cardsState.status === 'error'
      ? settingsErrorMessage(copy, cardsState.code)
      : '';

  return (
    <section
      className="preferences-settings"
      aria-labelledby="preferences-settings-title"
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">{copy.page.eyebrow}</span>
          <h1 id="preferences-settings-title">{copy.preferences.title}</h1>
          <p>{copy.preferences.description}</p>
        </div>
      </div>
      <div className="settings-content">
        <form
          action={summaryAction}
          className="settings-section"
          aria-label={copy.summary.title}
        >
          <div className="settings-section-head">
            <h2>{copy.summary.title}</h2>
            <p>{copy.summary.description}</p>
          </div>
          <label className="language-preferences__field">
            <span>{copy.summary.label}</span>
            <select
              aria-label={copy.summary.label}
              disabled={unavailable || summaryPending}
              name="summaryMode"
              onChange={(event) =>
                setMode(summaryModeSchema.parse(event.target.value))
              }
              value={mode}
            >
              {summaryModeSchema.options.map((option) => (
                <option key={option} value={option}>
                  {copy.summary.modes[option].title}
                </option>
              ))}
            </select>
            <span>{copy.summary.modes[mode].description}</span>
          </label>
          <div className="language-preferences__actions">
            <button
              className="ui-button"
              data-variant="primary"
              disabled={unavailable || summaryPending}
              type="submit"
            >
              {summaryPending ? copy.language.saving : copy.summary.save}
            </button>
            <p aria-live="polite" role={summaryError ? 'alert' : 'status'}>
              {summaryError ||
                (summaryState.status === 'success' ? copy.language.saved : '')}
            </p>
          </div>
        </form>
        <form
          action={cardsAction}
          className="settings-section"
          aria-label={copy.preferences.flashcards.title}
        >
          <div className="settings-section-head">
            <h2>{copy.preferences.flashcards.title}</h2>
            <p>{copy.preferences.flashcards.description}</p>
          </div>
          <label className="language-preferences__field">
            <span>{copy.preferences.flashcards.label}</span>
            <select
              aria-label={copy.preferences.flashcards.label}
              disabled={unavailable || cardsPending}
              name="flashcardPreset"
              onChange={(event) =>
                setCards(Number(event.target.value) as 18 | 30)
              }
              value={cards}
            >
              <option value={18}>18</option>
              <option value={30}>30</option>
            </select>
          </label>
          <div className="language-preferences__actions">
            <button
              className="ui-button"
              data-variant="primary"
              disabled={unavailable || cardsPending}
              type="submit"
            >
              {cardsPending
                ? copy.language.saving
                : copy.preferences.flashcards.save}
            </button>
            <p aria-live="polite" role={cardsError ? 'alert' : 'status'}>
              {cardsError ||
                (cardsState.status === 'success' ? copy.language.saved : '')}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
