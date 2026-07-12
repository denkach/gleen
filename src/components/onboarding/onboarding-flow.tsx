'use client';

import { useActionState, useState } from 'react';

import {
  saveOnboardingPreferences,
  type OnboardingActionState,
} from '@/lib/onboarding/actions';
import {
  supportedLocales,
  type OnboardingState,
} from '@/lib/onboarding/preferences';

import { AuthStatus } from '../auth/auth-status';

const localeNames: Record<(typeof supportedLocales)[number], string> = {
  uk: 'Українська',
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
};

type OnboardingFlowProps = Readonly<{ initialState: OnboardingState }>;

export function OnboardingFlow({ initialState }: OnboardingFlowProps) {
  const [step, setStep] = useState(initialState.onboardingStep);
  const [interfaceLocale, setInterfaceLocale] = useState(
    initialState.interfaceLocale,
  );
  const [outputLocale, setOutputLocale] = useState(initialState.outputLocale);
  const [summaryPreset, setSummaryPreset] = useState(
    initialState.summaryPreset,
  );
  const [flashcardPreset, setFlashcardPreset] = useState(
    initialState.flashcardPreset,
  );
  const [actionState, formAction, pending] = useActionState(
    async (previousState: OnboardingActionState, formData: FormData) => {
      const nextState = await saveOnboardingPreferences(
        previousState,
        formData,
      );
      if (nextState.data) setStep(nextState.data.onboardingStep);
      if (nextState.redirectTo) window.location.assign(nextState.redirectTo);
      return nextState;
    },
    { status: 'idle', data: initialState } satisfies OnboardingActionState,
  );

  const title =
    step === 1
      ? 'Interface language'
      : step === 2
        ? 'Output language'
        : 'Output preferences';
  const description =
    step === 1
      ? 'Choose the language used throughout the Gleen interface.'
      : step === 2
        ? 'Choose the default language for generated content independently.'
        : 'Choose defaults for every new analysis. You can change them per video.';

  return (
    <div className="onboarding-card">
      <span className="eyebrow">Personalize Gleen</span>
      <div className="onboarding-progress" aria-label={`Step ${step} of 3`}>
        <span>Step {step} of 3</span>
        <i style={{ width: `${(step / 3) * 100}%` }} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <form action={formAction}>
        <input type="hidden" name="step" value={step} />
        {step === 1 ? (
          <LocaleChoices
            name="interfaceLocale"
            value={interfaceLocale}
            onChange={setInterfaceLocale}
          />
        ) : null}
        {step === 2 ? (
          <LocaleChoices
            name="outputLocale"
            value={outputLocale}
            onChange={setOutputLocale}
          />
        ) : null}
        {step === 3 ? (
          <div className="preference-grid">
            <SelectionCard
              name="summaryPreset"
              value="balanced"
              selected={summaryPreset === 'balanced'}
              title="Balanced summary"
              description="Clear structure with useful detail"
              onSelect={() => setSummaryPreset('balanced')}
            />
            <SelectionCard
              name="summaryPreset"
              value="detailed"
              selected={summaryPreset === 'detailed'}
              title="Detailed summary"
              description="More context and deeper chapter notes"
              onSelect={() => setSummaryPreset('detailed')}
            />
            <SelectionCard
              name="flashcardPreset"
              value="18"
              selected={flashcardPreset === 18}
              title="18 flashcards"
              description="A focused study deck"
              onSelect={() => setFlashcardPreset(18)}
            />
            <SelectionCard
              name="flashcardPreset"
              value="30"
              selected={flashcardPreset === 30}
              title="30 flashcards"
              description="A more comprehensive deck"
              onSelect={() => setFlashcardPreset(30)}
            />
          </div>
        ) : null}
        {actionState.message ? (
          <AuthStatus tone="error">{actionState.message}</AuthStatus>
        ) : null}
        <div className="onboarding-actions">
          {step > 1 ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setStep(step === 3 ? 2 : 1)}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <div>
            {step > 1 ? (
              <button
                className="text-action"
                type="submit"
                name="skip"
                value="true"
                disabled={pending}
              >
                Skip for now
              </button>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={pending}
            >
              {pending ? 'Saving…' : step === 3 ? 'Finish setup' : 'Continue'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

type LocaleChoicesProps = Readonly<{
  name: string;
  value: (typeof supportedLocales)[number];
  onChange(value: (typeof supportedLocales)[number]): void;
}>;

function LocaleChoices({ name, value, onChange }: LocaleChoicesProps) {
  return (
    <div className="language-list" role="radiogroup" aria-label={name}>
      {supportedLocales.map((locale) => (
        <button
          className={`language-option${value === locale ? ' active' : ''}`}
          key={locale}
          type="button"
          role="radio"
          aria-checked={value === locale}
          onClick={() => onChange(locale)}
        >
          <span>{localeNames[locale]}</span>
          <span className="code">{locale.toUpperCase()}</span>
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

type SelectionCardProps = Readonly<{
  name: string;
  value: string;
  selected: boolean;
  title: string;
  description: string;
  onSelect(): void;
}>;

function SelectionCard({
  name,
  value,
  selected,
  title,
  description,
  onSelect,
}: SelectionCardProps) {
  return (
    <label className={`select-card${selected ? ' active' : ''}`}>
      <input
        className="sr-only"
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
      />
      <strong>{title}</strong>
      <span>{description}</span>
    </label>
  );
}
