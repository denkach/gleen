'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  saveOnboardingPreferences,
  type OnboardingActionState,
} from '@/lib/onboarding/actions';
import {
  supportedLocales,
  type OnboardingState,
} from '@/lib/onboarding/preferences';
import { localeMetadata } from '@/lib/i18n/locales';
import {
  onboardingErrorMessage,
  type OnboardingCopy,
} from '@/lib/i18n/messages/onboarding';

import { AuthStatus } from '../auth/auth-status';

type OnboardingFlowProps = Readonly<{
  initialState: OnboardingState;
  copy: OnboardingCopy;
}>;

export function OnboardingFlow({ initialState, copy }: OnboardingFlowProps) {
  const router = useRouter();
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
      const submittedStep = Number(formData.get('step'));
      const nextState = await saveOnboardingPreferences(
        previousState,
        formData,
      );
      if (nextState.data) setStep(nextState.data.onboardingStep);
      if (nextState.status === 'success' && submittedStep === 1) {
        router.refresh();
      }
      if (nextState.redirectTo) window.location.assign(nextState.redirectTo);
      return nextState;
    },
    { status: 'idle', data: initialState } satisfies OnboardingActionState,
  );

  const title =
    step === 1
      ? copy.steps.interface.title
      : step === 2
        ? copy.steps.output.title
        : copy.steps.preferences.title;
  const description =
    step === 1
      ? copy.steps.interface.description
      : step === 2
        ? copy.steps.output.description
        : copy.steps.preferences.description;
  const progress = copy.progress[`step${step}`];

  return (
    <div className="onboarding-card">
      <span className="eyebrow">{copy.eyebrow}</span>
      <div
        className="onboarding-progress"
        role="status"
        aria-label={progress}
        aria-live="polite"
      >
        <span>{progress}</span>
        <i style={{ width: `${(step / 3) * 100}%` }} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <form action={formAction}>
        <input type="hidden" name="step" value={step} />
        <input type="hidden" name="interfaceLocale" value={interfaceLocale} />
        <input type="hidden" name="outputLocale" value={outputLocale} />
        {step === 1 ? (
          <LocaleChoices
            value={interfaceLocale}
            onChange={setInterfaceLocale}
            label={copy.steps.interface.choicesLabel}
          />
        ) : null}
        {step === 2 ? (
          <LocaleChoices
            value={outputLocale}
            onChange={setOutputLocale}
            label={copy.steps.output.choicesLabel}
          />
        ) : null}
        {step === 3 ? (
          <div className="preference-grid">
            <SelectionCard
              name="summaryPreset"
              value="balanced"
              selected={summaryPreset === 'balanced'}
              title={copy.presets.summaryBalanced.title}
              description={copy.presets.summaryBalanced.description}
              onSelect={() => setSummaryPreset('balanced')}
            />
            <SelectionCard
              name="summaryPreset"
              value="deep"
              selected={summaryPreset === 'deep'}
              title={copy.presets.summaryDetailed.title}
              description={copy.presets.summaryDetailed.description}
              onSelect={() => setSummaryPreset('deep')}
            />
            <SelectionCard
              name="flashcardPreset"
              value="18"
              selected={flashcardPreset === 18}
              title={copy.presets.flashcards18.title}
              description={copy.presets.flashcards18.description}
              onSelect={() => setFlashcardPreset(18)}
            />
            <SelectionCard
              name="flashcardPreset"
              value="30"
              selected={flashcardPreset === 30}
              title={copy.presets.flashcards30.title}
              description={copy.presets.flashcards30.description}
              onSelect={() => setFlashcardPreset(30)}
            />
          </div>
        ) : null}
        {actionState.status === 'error' ? (
          <AuthStatus tone="error">
            {onboardingErrorMessage(copy, actionState.code)}
          </AuthStatus>
        ) : null}
        <div className="onboarding-actions">
          {step > 1 ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setStep(step === 3 ? 2 : 1)}
            >
              {copy.actions.back}
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
                {copy.actions.skip}
              </button>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={pending}
            >
              {pending
                ? copy.actions.saving
                : step === 3
                  ? copy.actions.finish
                  : copy.actions.continue}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

type LocaleChoicesProps = Readonly<{
  value: (typeof supportedLocales)[number];
  onChange(value: (typeof supportedLocales)[number]): void;
  label: string;
}>;

function LocaleChoices({ value, onChange, label }: LocaleChoicesProps) {
  return (
    <div className="language-list" role="radiogroup" aria-label={label}>
      {supportedLocales.map((locale) => (
        <button
          className={`language-option${value === locale ? ' active' : ''}`}
          key={locale}
          type="button"
          role="radio"
          aria-checked={value === locale}
          onClick={() => onChange(locale)}
        >
          <span>{localeMetadata[locale].nativeName}</span>
          <span className="code">{locale.toUpperCase()}</span>
        </button>
      ))}
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
