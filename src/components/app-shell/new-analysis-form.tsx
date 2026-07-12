'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useFormStatus } from 'react-dom';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  reanalyzeIntake,
  submitYouTubeIntake,
  type IntakeActionState,
} from '@/lib/youtube-intake/actions';
import {
  supportedLocales,
  type OnboardingState,
} from '@/lib/onboarding/preferences';

import { AppIcon } from './app-icon';
import { AnalyzeProcessingVisual } from './analyze-processing-visual';

type IntakeAction = (
  previousState: IntakeActionState,
  formData: FormData,
) => Promise<IntakeActionState>;

type NewAnalysisFormProps = Readonly<{
  initialState: IntakeActionState;
  action?: IntakeAction;
  reanalyzeAction?: IntakeAction;
  resultPathPrefix?: string;
}>;

const artifactOptions = [
  ['summary', 'Summary'],
  ['timestamps', 'Timestamps'],
  ['transcript', 'Transcript'],
  ['flashcards', 'Flashcards'],
] as const;

const localeNames: Record<(typeof supportedLocales)[number], string> = {
  uk: 'Українська',
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
};

function SubmitButton({ pending }: Readonly<{ pending: boolean }>) {
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      <span>{pending ? 'Analyzing…' : 'Analyze video'}</span>
      <AppIcon name="arrow" />
    </button>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Confirm analysis'}
    </button>
  );
}

export function NewAnalysisForm({
  action = submitYouTubeIntake,
  initialState,
  reanalyzeAction = reanalyzeIntake,
  resultPathPrefix = '/app/video',
}: NewAnalysisFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const runReanalysis = useCallback(
    (_previousState: IntakeActionState, formData: FormData) =>
      reanalyzeAction(state, formData),
    [reanalyzeAction, state],
  );
  const [reanalyzeState, reanalyzeFormAction] = useActionState(
    runReanalysis,
    state,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedArtifacts, setSelectedArtifacts] = useState<
    (typeof artifactOptions)[number][0][]
  >(initialState.configuration.artifacts);
  const [outputLocale, setOutputLocale] = useState<
    OnboardingState['outputLocale']
  >(initialState.configuration.outputLocale);
  const [summaryPreset, setSummaryPreset] = useState<
    OnboardingState['summaryPreset']
  >(initialState.configuration.summaryPreset);
  const [flashcardPreset, setFlashcardPreset] = useState<18 | 30>(
    initialState.configuration.flashcardPreset,
  );
  const [clientMessage, setClientMessage] = useState<string>();
  const [submittedUrl, setSubmittedUrl] = useState(initialState.rawUrl);
  const formRef = useRef<HTMLFormElement>(null);
  const submissionStartedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    const isReanalysisRedirect = Boolean(reanalyzeState.redirectTo);
    const redirectTo = reanalyzeState.redirectTo ?? state.redirectTo;
    if (!redirectTo) return;

    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const openingRemainder =
      !isReanalysisRedirect && submissionStartedAt.current !== undefined
        ? Math.max(0, 1800 - (Date.now() - submissionStartedAt.current))
        : 0;
    if (reducedMotion || openingRemainder === 0) {
      router.push(redirectTo);
      return;
    }

    const navigationTimer = window.setTimeout(
      () => router.push(redirectTo),
      openingRemainder,
    );
    return () => window.clearTimeout(navigationTimer);
  }, [reanalyzeState.redirectTo, router, state.redirectTo]);

  const selectionSummary = artifactOptions
    .filter(([value]) => selectedArtifacts.includes(value))
    .map(([, label]) => label)
    .join(', ');

  function validateArtifacts(event: FormEvent<HTMLFormElement>) {
    if (selectedArtifacts.length > 0) {
      setClientMessage(undefined);
      setSubmittedUrl(
        new FormData(event.currentTarget).get('rawUrl')?.toString() ?? '',
      );
      submissionStartedAt.current = Date.now();
      return;
    }
    event.preventDefault();
    setClientMessage('Choose at least one artifact.');
  }

  const visualState = pending
    ? 'submitting'
    : state.status === 'error'
      ? 'error'
      : null;

  return (
    <>
      <form
        ref={formRef}
        id="new-analysis-form"
        action={formAction}
        className={`beam-form app-beam-form${visualState ? ' processing-hidden' : ''}`}
        aria-describedby="intake-status"
        aria-hidden={visualState ? true : undefined}
        inert={visualState ? true : undefined}
        onSubmit={validateArtifacts}
      >
        <AppIcon name="link" className="link-icon" />
        <input
          aria-label="YouTube URL"
          name="rawUrl"
          type="url"
          placeholder="Paste a YouTube link"
          defaultValue={state.rawUrl}
          required
          disabled={pending}
        />
        <input type="hidden" name="outputLocale" value={outputLocale} />
        <input type="hidden" name="summaryPreset" value={summaryPreset} />
        <input type="hidden" name="flashcardPreset" value={flashcardPreset} />
        {selectedArtifacts.map((artifact) => (
          <input
            key={artifact}
            type="hidden"
            name="artifacts"
            value={artifact}
          />
        ))}
        <SubmitButton pending={pending} />
      </form>

      {visualState ? (
        <AnalyzeProcessingVisual
          state={visualState}
          selectedArtifacts={selectedArtifacts}
          submittedUrl={state.rawUrl || submittedUrl}
          errorMessage={visualState === 'error' ? state.message : undefined}
          onRetry={
            visualState === 'error'
              ? () => formRef.current?.requestSubmit()
              : undefined
          }
        />
      ) : null}

      <div className={`analysis-form-meta${pending ? ' pending' : ''}`}>
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogTrigger className="advanced-link" disabled={pending}>
            <AppIcon name="settings" /> Advanced options
          </DialogTrigger>
          <DialogContent
            className="analysis-options"
            title="Advanced options"
            description="Choose the knowledge artifacts for this analysis."
          >
            <fieldset>
              <legend>Output language</legend>
              <div
                className="language-list"
                role="radiogroup"
                aria-label="Output language"
              >
                {supportedLocales.map((locale) => (
                  <button
                    className={`language-option${outputLocale === locale ? ' active' : ''}`}
                    key={locale}
                    type="button"
                    role="radio"
                    aria-label={localeNames[locale]}
                    aria-checked={outputLocale === locale}
                    onClick={() => setOutputLocale(locale)}
                  >
                    <span>{localeNames[locale]}</span>
                    <span className="code">{locale.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Artifacts</legend>
              <div className="artifact-options">
                {artifactOptions.map(([value, label]) => (
                  <label key={value} className="artifact-option">
                    <input
                      type="checkbox"
                      value={value}
                      checked={selectedArtifacts.includes(value)}
                      onChange={(event) => {
                        setClientMessage(undefined);
                        setSelectedArtifacts((current) =>
                          event.target.checked
                            ? [...current, value]
                            : current.filter((artifact) => artifact !== value),
                        );
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {selectedArtifacts.includes('summary') ? (
              <label className="preset-option">
                <span>Summary preset</span>
                <select
                  aria-label="Summary preset"
                  value={summaryPreset}
                  onChange={(event) =>
                    setSummaryPreset(
                      event.target.value as OnboardingState['summaryPreset'],
                    )
                  }
                >
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
            ) : null}
            {selectedArtifacts.includes('flashcards') ? (
              <label className="preset-option">
                <span>Flashcard count</span>
                <select
                  aria-label="Flashcard count"
                  value={flashcardPreset}
                  onChange={(event) =>
                    setFlashcardPreset(Number(event.target.value) as 18 | 30)
                  }
                >
                  <option value="18">18</option>
                  <option value="30">30</option>
                </select>
              </label>
            ) : null}
            <DialogClose className="btn btn-secondary" type="button">
              Done
            </DialogClose>
          </DialogContent>
        </Dialog>
        <p className="selection-summary">
          {selectionSummary || 'No artifacts selected'}
        </p>
      </div>

      {clientMessage || (state.status === 'error' && !visualState) ? (
        <p className="intake-status" id="intake-status" role="status">
          {clientMessage ?? state.message}
        </p>
      ) : (
        <span id="intake-status" className="sr-only" />
      )}

      {state.status === 'duplicate' && state.existingId ? (
        <section className="duplicate-banner" aria-labelledby="duplicate-title">
          <h2 id="duplicate-title">You already analyzed this video.</h2>
          <p>No credits will be used.</p>
          <Link href={`${resultPathPrefix}/${state.existingId}`}>
            Open saved result
          </Link>
          <button type="button" onClick={() => setConfirmOpen(true)}>
            Analyze again
          </button>
        </section>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="reanalyze-dialog"
          title="Analyze this video again?"
          description="A new processing attempt will be created."
        >
          {state.duplicateConfiguration ? (
            <dl className="reanalyze-configuration">
              <div>
                <dt>Output language</dt>
                <dd>{state.duplicateConfiguration.outputLocale}</dd>
              </div>
              <div>
                <dt>Artifacts</dt>
                <dd>
                  {artifactOptions
                    .filter(([value]) =>
                      state.duplicateConfiguration?.artifacts.includes(value),
                    )
                    .map(([, label]) => label)
                    .join(', ')}
                </dd>
              </div>
              {state.duplicateConfiguration.summaryPreset ? (
                <div>
                  <dt>Summary</dt>
                  <dd>
                    {state.duplicateConfiguration.summaryPreset === 'detailed'
                      ? 'Detailed'
                      : 'Balanced'}
                  </dd>
                </div>
              ) : null}
              {state.duplicateConfiguration.flashcardPreset ? (
                <div>
                  <dt>Flashcards</dt>
                  <dd>{state.duplicateConfiguration.flashcardPreset}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          <form
            action={reanalyzeFormAction}
            className="reanalyze-dialog-actions"
          >
            <input type="hidden" name="sourceId" value={state.existingId} />
            <DialogClose className="btn btn-secondary" type="button">
              Cancel
            </DialogClose>
            <ConfirmButton />
          </form>
          {reanalyzeState.status === 'error' ? (
            <p className="intake-status" role="status" aria-live="polite">
              {reanalyzeState.message}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
