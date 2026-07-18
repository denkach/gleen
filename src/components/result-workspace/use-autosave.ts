'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResultSaveState } from '@/lib/result-workspace/actions';

export type AutosaveState =
  'idle' | 'saving' | 'saved' | 'conflict' | 'error' | 'offline';

export function useAutosave<T>({
  value,
  revision,
  save,
  delayMs = 700,
}: Readonly<{
  value: T;
  revision: string;
  save: (value: T, revision: string) => Promise<ResultSaveState>;
  delayMs?: number;
}>): Readonly<{ status: AutosaveState; retry: () => void }> {
  const [status, setStatus] = useState<AutosaveState>('idle');
  const [attempt, setAttempt] = useState(0);
  const initialValue = useRef(value);
  const lastSavedValue = useRef(value);
  const revisionRef = useRef(revision);
  const propRevisionRef = useRef(revision);
  const requestRef = useRef(0);
  const latestValue = useRef(value);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  useEffect(() => {
    if (propRevisionRef.current !== revision) {
      propRevisionRef.current = revision;
      initialValue.current = latestValue.current;
      lastSavedValue.current = latestValue.current;
      setStatus('idle');
    }
    revisionRef.current = revision;
  }, [revision]);

  useEffect(() => {
    if (Object.is(value, initialValue.current) && attempt === 0) return;
    if (Object.is(value, lastSavedValue.current) && attempt === 0) return;

    const request = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      if (!window.navigator.onLine) {
        if (request === requestRef.current) setStatus('offline');
        return;
      }
      setStatus('saving');
      try {
        const result = await save(value, revisionRef.current);
        if (request !== requestRef.current) return;
        if (result.status === 'saved') {
          lastSavedValue.current = value;
          initialValue.current = value;
          revisionRef.current = result.updatedAt;
          setStatus('saved');
        } else {
          setStatus(result.status);
        }
      } catch {
        if (request === requestRef.current) setStatus('error');
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [attempt, delayMs, save, value]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { status, retry };
}
