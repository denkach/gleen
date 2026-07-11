'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';

import { MarketingIcon } from './marketing-icon';

export type BeamDemoState = 'idle' | 'invalid' | 'refracting' | 'complete';

export function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (host === 'youtu.be' ||
        host === 'youtube.com' ||
        host.endsWith('.youtube.com'))
    );
  } catch {
    return false;
  }
}

export function BeamInput({
  onDemoStateChange,
}: Readonly<{ onDemoStateChange?: (state: BeamDemoState) => void }>) {
  const [state, setState] = useState<BeamDemoState>('idle');
  const [error, setError] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => timers.current.forEach((timer) => clearTimeout(timer)),
    [],
  );

  function transition(next: BeamDemoState) {
    setState(next);
    onDemoStateChange?.(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'refracting') return;

    const form = new FormData(event.currentTarget);
    const value = String(form.get('url') ?? '').trim();
    if (!isYouTubeUrl(value)) {
      setError(
        value ? 'Use a YouTube or youtu.be URL.' : 'Enter a YouTube URL.',
      );
      transition('invalid');
      return;
    }

    setError('');
    transition('refracting');
    timers.current.push(
      setTimeout(() => transition('complete'), 1600),
      setTimeout(() => transition('idle'), 2500),
    );
  }

  const busy = state === 'refracting';
  return (
    <form
      className="beam-form"
      aria-label="Analyze a YouTube video"
      data-demo-state={state}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="youtube-url">
        YouTube URL
      </label>
      <MarketingIcon className="icon link-icon" name="link" />
      <input
        id="youtube-url"
        name="url"
        type="url"
        placeholder="Paste a YouTube link"
        required
        aria-invalid={state === 'invalid'}
        aria-describedby={error ? 'youtube-url-error' : undefined}
        disabled={busy}
      />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Refracting…' : 'Transform video'}
        {!busy && <MarketingIcon className="icon icon-sm" name="arrow" />}
      </button>
      {error && (
        <p className="beam-feedback" id="youtube-url-error" role="alert">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {state === 'complete' ? 'Demo artifacts are ready.' : ''}
      </p>
    </form>
  );
}
