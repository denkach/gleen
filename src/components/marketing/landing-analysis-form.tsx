'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { buildAnalysisContinuation } from '@/lib/youtube-intake/continuation';

const Arrow = () => (
  <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const LinkIcon = () => (
  <svg className="icon link-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
    <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
  </svg>
);

export function LandingAnalysisForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawUrl = new FormData(event.currentTarget).get('youtubeUrl');
    const nextPath =
      typeof rawUrl === 'string' ? buildAnalysisContinuation(rawUrl) : null;

    if (!nextPath) {
      setError('Enter a supported YouTube URL.');
      return;
    }

    setError(undefined);
    router.push(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <>
      <form
        className="beam-form"
        aria-label="Analyze a YouTube video"
        onSubmit={handleSubmit}
        noValidate
      >
        <label className="sr-only" htmlFor="youtube-url">
          YouTube URL
        </label>
        <LinkIcon />
        <input
          id="youtube-url"
          name="youtubeUrl"
          type="url"
          placeholder="Paste a YouTube link"
          defaultValue="https://youtube.com/watch?v=knowledge"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'youtube-url-error' : undefined}
        />
        <button className="btn btn-primary" type="submit">
          <span>Transform video</span>
          <Arrow />
        </button>
      </form>
      {error ? (
        <p className="sr-only" id="youtube-url-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
