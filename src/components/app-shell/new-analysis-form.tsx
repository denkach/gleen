'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import { useFormStatus } from 'react-dom';

import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import {
  reanalyzeIntake,
  submitYouTubeIntake,
  type IntakeActionState,
} from '@/lib/youtube-intake/actions';

import { AppIcon } from './app-icon';

type IntakeAction = (
  previousState: IntakeActionState,
  formData: FormData,
) => Promise<IntakeActionState>;

type NewAnalysisFormProps = Readonly<{
  initialState: IntakeActionState;
  action?: IntakeAction;
  reanalyzeAction?: IntakeAction;
}>;

const artifactOptions = [
  ['summary', 'Summary'],
  ['timestamps', 'Timestamps'],
  ['transcript', 'Transcript'],
  ['flashcards', 'Flashcards'],
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
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
}: NewAnalysisFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
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
  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>(
    initialState.configuration.artifacts,
  );
  const [clientMessage, setClientMessage] = useState<string>();

  useEffect(() => {
    const redirectTo = reanalyzeState.redirectTo ?? state.redirectTo;
    if (redirectTo) router.push(redirectTo);
  }, [reanalyzeState.redirectTo, router, state.redirectTo]);

  const selectionSummary = artifactOptions
    .filter(([value]) => selectedArtifacts.includes(value))
    .map(([, label]) => label)
    .join(', ');

  function validateArtifacts(event: FormEvent<HTMLFormElement>) {
    if (selectedArtifacts.length > 0) {
      setClientMessage(undefined);
      return;
    }
    event.preventDefault();
    setClientMessage('Choose at least one artifact.');
  }

  return (
    <>
      <form
        action={formAction}
        className="beam-form app-beam-form"
        aria-describedby="intake-status"
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
        />
        <input
          type="hidden"
          name="outputLocale"
          value={state.configuration.outputLocale}
        />
        <input
          type="hidden"
          name="summaryPreset"
          value={state.configuration.summaryPreset}
        />
        <SubmitButton />

        <div className="analysis-options" hidden={!advancedOpen}>
          <fieldset>
            <legend>Artifacts</legend>
            <div className="artifact-options">
              {artifactOptions.map(([value, label]) => (
                <label key={value} className="artifact-option">
                  <input
                    type="checkbox"
                    name="artifacts"
                    value={value}
                    defaultChecked={selectedArtifacts.includes(value)}
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
          {selectedArtifacts.includes('flashcards') ? (
            <label className="preset-option">
              <span>Flashcard count</span>
              <select
                aria-label="Flashcard count"
                name="flashcardPreset"
                defaultValue={state.configuration.flashcardPreset}
              >
                <option value="18">18</option>
                <option value="30">30</option>
              </select>
            </label>
          ) : (
            <input
              type="hidden"
              name="flashcardPreset"
              value={state.configuration.flashcardPreset}
            />
          )}
        </div>
      </form>

      <div className="analysis-form-meta">
        <button
          className="advanced-link"
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          <AppIcon name="settings" /> Advanced options
        </button>
        <p className="selection-summary">
          {selectionSummary || 'No artifacts selected'}
        </p>
      </div>

      {clientMessage || state.status === 'error' ? (
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
          <Link href={`/app/video/${state.existingId}`}>Open saved result</Link>
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
          <dl className="reanalyze-configuration">
            <div>
              <dt>Output language</dt>
              <dd>{state.configuration.outputLocale}</dd>
            </div>
            <div>
              <dt>Artifacts</dt>
              <dd>{selectionSummary}</dd>
            </div>
            {selectedArtifacts.includes('summary') ? (
              <div>
                <dt>Summary</dt>
                <dd>{state.configuration.summaryPreset}</dd>
              </div>
            ) : null}
            {selectedArtifacts.includes('flashcards') ? (
              <div>
                <dt>Flashcards</dt>
                <dd>{state.configuration.flashcardPreset}</dd>
              </div>
            ) : null}
          </dl>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
