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
import type { AnalysisVisualState } from '@/lib/analyze-processing/analysis-visual-state';
import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import { localeMetadata } from '@/lib/i18n/locales';
import { appIntakeErrorMessage } from '@/lib/i18n/app-format';
import type { AppMessages } from '@/lib/i18n/messages/app';
import {
  supportedLocales,
  type OnboardingState,
} from '@/lib/onboarding/preferences';

import { AppIcon } from './app-icon';
import { AnalyzeProcessingVisual } from './analyze-processing-visual';
import { InlineAnalysisProcessing } from './inline-analysis-processing';

type IntakeAction = (
  previousState: IntakeActionState,
  formData: FormData,
) => Promise<IntakeActionState>;

type NewAnalysisFormProps = Readonly<{
  copy: AppMessages;
  initialState: IntakeActionState;
  action?: IntakeAction;
  reanalyzeAction?: IntakeAction;
  resultPathPrefix?: string;
  resultQuery?: string;
  initialSnapshot?: AnalysisSnapshot;
  autoSubmit?: boolean;
}>;

const artifactOptions = [
  'summary',
  'timestamps',
  'transcript',
  'flashcards',
] as const;

function SubmitButton({
  copy,
  pending,
}: Readonly<{ copy: AppMessages['newAnalysis']; pending: boolean }>) {
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      <span>{pending ? copy.submitting : copy.submit}</span>
      <AppIcon name="arrow" />
    </button>
  );
}

function ConfirmButton({
  copy,
}: Readonly<{ copy: AppMessages['newAnalysis'] }>) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? copy.duplicate.creating : copy.duplicate.confirm}
    </button>
  );
}

export function NewAnalysisForm({
  action = submitYouTubeIntake,
  copy,
  initialState,
  reanalyzeAction = reanalyzeIntake,
  resultPathPrefix = '/app/video',
  resultQuery,
  initialSnapshot,
  autoSubmit = false,
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
    (typeof artifactOptions)[number][]
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
  const [visualState, setVisualState] = useState<AnalysisVisualState>('idle');
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  const startVisualTimeline = useCallback(() => {
    setVisualState('submitting');
  }, []);

  useEffect(() => {
    if (
      state.status === 'error' &&
      state.code === 'usage_limit_reached' &&
      state.redirectTo === '/app/subscription/limit-reached'
    ) {
      router.push('/app/subscription/limit-reached');
    }
  }, [router, state]);

  useEffect(() => {
    if (
      reanalyzeState.status === 'error' &&
      reanalyzeState.code === 'usage_limit_reached' &&
      reanalyzeState.redirectTo === '/app/subscription/limit-reached'
    ) {
      router.push('/app/subscription/limit-reached');
    } else if (reanalyzeState.status === 'ready' && reanalyzeState.redirectTo) {
      router.push(reanalyzeState.redirectTo);
    }
  }, [reanalyzeState, router]);

  useEffect(() => {
    if (!autoSubmit || autoSubmitted.current || !formRef.current) return;
    autoSubmitted.current = true;
    window.history.replaceState(window.history.state, '', '/app');
    formRef.current.requestSubmit();
  }, [autoSubmit]);

  const selectionSummary = artifactOptions
    .filter((value) => selectedArtifacts.includes(value))
    .map((value) => copy.newAnalysis.artifacts[value])
    .join(', ');

  function validateArtifacts(event: FormEvent<HTMLFormElement>) {
    if (selectedArtifacts.length > 0) {
      setClientMessage(undefined);
      setSubmittedUrl(
        new FormData(event.currentTarget).get('rawUrl')?.toString() ?? '',
      );
      startVisualTimeline();
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      if (submitter instanceof HTMLButtonElement) submitter.disabled = true;
      return;
    }
    event.preventDefault();
    setClientMessage(copy.newAnalysis.advanced.chooseArtifact);
  }

  const resolvedWithoutRedirect =
    !pending &&
    !state.analysisId &&
    ['idle', 'duplicate'].includes(state.status);
  const displayVisualState = pending
    ? visualState
    : state.status === 'error'
      ? 'error'
      : resolvedWithoutRedirect
        ? 'idle'
        : visualState;
  const isVisualBusy = displayVisualState !== 'idle';

  return (
    <>
      {state.analysisId ? (
        <InlineAnalysisProcessing
          copy={copy}
          analysisId={state.analysisId}
          initialSnapshot={initialSnapshot}
          resultPathPrefix={resultPathPrefix}
          preservedQuery={resultQuery}
          selectedArtifactKinds={state.configuration.artifacts}
        />
      ) : (
        <AnalyzeProcessingVisual
          copy={copy.processing}
          state={displayVisualState}
          submittedUrl={state.rawUrl || submittedUrl}
          errorMessage={
            displayVisualState === 'error'
              ? appIntakeErrorMessage(copy, state.code)
              : undefined
          }
          onRetry={
            displayVisualState === 'error'
              ? () => formRef.current?.requestSubmit()
              : undefined
          }
          idleContent={
            <form
              ref={formRef}
              id="new-analysis-form"
              action={formAction}
              className="beam-form app-beam-form"
              aria-describedby="intake-status"
              aria-hidden={isVisualBusy ? true : undefined}
              inert={isVisualBusy ? true : undefined}
              onSubmit={validateArtifacts}
            >
              <AppIcon name="link" className="link-icon" />
              <input
                aria-label={copy.newAnalysis.urlLabel}
                name="rawUrl"
                type="url"
                placeholder={copy.newAnalysis.urlPlaceholder}
                defaultValue={state.rawUrl}
                required
                disabled={pending}
              />
              <input type="hidden" name="outputLocale" value={outputLocale} />
              <input type="hidden" name="summaryPreset" value={summaryPreset} />
              <input
                type="hidden"
                name="flashcardPreset"
                value={flashcardPreset}
              />
              {selectedArtifacts.map((artifact) => (
                <input
                  key={artifact}
                  type="hidden"
                  name="artifacts"
                  value={artifact}
                />
              ))}
              <SubmitButton copy={copy.newAnalysis} pending={pending} />
            </form>
          }
        />
      )}

      <div className={`analysis-form-meta${pending ? ' pending' : ''}`}>
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogTrigger className="advanced-link" disabled={pending}>
            <AppIcon name="settings" /> {copy.newAnalysis.advanced.trigger}
          </DialogTrigger>
          <DialogContent
            className="analysis-options"
            title={copy.newAnalysis.advanced.title}
            description={copy.newAnalysis.advanced.description}
          >
            <fieldset>
              <legend>{copy.newAnalysis.advanced.outputLanguage}</legend>
              <div
                className="language-list"
                role="radiogroup"
                aria-label={copy.newAnalysis.advanced.outputLanguage}
              >
                {supportedLocales.map((locale) => (
                  <button
                    className={`language-option${outputLocale === locale ? ' active' : ''}`}
                    key={locale}
                    type="button"
                    role="radio"
                    aria-label={localeMetadata[locale].nativeName}
                    aria-checked={outputLocale === locale}
                    onClick={() => setOutputLocale(locale)}
                  >
                    <span>{localeMetadata[locale].nativeName}</span>
                    <span className="code">{locale.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{copy.newAnalysis.advanced.artifacts}</legend>
              <div className="artifact-options">
                {artifactOptions.map((value) => (
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
                    <span>{copy.newAnalysis.artifacts[value]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {selectedArtifacts.includes('summary') ? (
              <label className="preset-option">
                <span>{copy.newAnalysis.advanced.summaryPreset}</span>
                <select
                  aria-label={copy.newAnalysis.advanced.summaryPreset}
                  value={summaryPreset}
                  onChange={(event) =>
                    setSummaryPreset(
                      event.target.value as OnboardingState['summaryPreset'],
                    )
                  }
                >
                  <option value="balanced">
                    {copy.newAnalysis.advanced.balanced}
                  </option>
                  <option value="detailed">
                    {copy.newAnalysis.advanced.detailed}
                  </option>
                </select>
              </label>
            ) : null}
            {selectedArtifacts.includes('flashcards') ? (
              <label className="preset-option">
                <span>{copy.newAnalysis.advanced.flashcardCount}</span>
                <select
                  aria-label={copy.newAnalysis.advanced.flashcardCount}
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
              {copy.newAnalysis.advanced.done}
            </DialogClose>
          </DialogContent>
        </Dialog>
        <p className="selection-summary">
          {selectionSummary || copy.newAnalysis.advanced.noArtifacts}
        </p>
      </div>

      {clientMessage || (state.status === 'error' && !visualState) ? (
        <p className="intake-status" id="intake-status" role="status">
          {clientMessage ?? appIntakeErrorMessage(copy, state.code)}
        </p>
      ) : (
        <span id="intake-status" className="sr-only" />
      )}

      {state.status === 'duplicate' && state.existingId ? (
        <section className="duplicate-banner" aria-labelledby="duplicate-title">
          <h2 id="duplicate-title">{copy.newAnalysis.duplicate.title}</h2>
          <p>{copy.newAnalysis.duplicate.noCredits}</p>
          <Link
            href={`${resultPathPrefix}/${state.existingId}${resultQuery ? `?${resultQuery}` : ''}`}
          >
            {copy.newAnalysis.duplicate.openSaved}
          </Link>
          <button type="button" onClick={() => setConfirmOpen(true)}>
            {copy.newAnalysis.duplicate.analyzeAgain}
          </button>
        </section>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="reanalyze-dialog"
          title={copy.newAnalysis.duplicate.dialogTitle}
          description={copy.newAnalysis.duplicate.dialogDescription}
        >
          {state.duplicateConfiguration ? (
            <dl className="reanalyze-configuration">
              <div>
                <dt>{copy.newAnalysis.advanced.outputLanguage}</dt>
                <dd>
                  {
                    localeMetadata[state.duplicateConfiguration.outputLocale]
                      .nativeName
                  }
                </dd>
              </div>
              <div>
                <dt>{copy.newAnalysis.advanced.artifacts}</dt>
                <dd>
                  {artifactOptions
                    .filter((value) =>
                      state.duplicateConfiguration?.artifacts.includes(value),
                    )
                    .map((value) => copy.newAnalysis.artifacts[value])
                    .join(', ')}
                </dd>
              </div>
              {state.duplicateConfiguration.summaryPreset ? (
                <div>
                  <dt>{copy.newAnalysis.artifacts.summary}</dt>
                  <dd>
                    {state.duplicateConfiguration.summaryPreset === 'detailed'
                      ? copy.newAnalysis.advanced.detailed
                      : copy.newAnalysis.advanced.balanced}
                  </dd>
                </div>
              ) : null}
              {state.duplicateConfiguration.flashcardPreset ? (
                <div>
                  <dt>{copy.newAnalysis.artifacts.flashcards}</dt>
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
              {copy.newAnalysis.duplicate.cancel}
            </DialogClose>
            <ConfirmButton copy={copy.newAnalysis} />
          </form>
          {reanalyzeState.status === 'error' ? (
            <p className="intake-status" role="status" aria-live="polite">
              {appIntakeErrorMessage(copy, reanalyzeState.code)}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
