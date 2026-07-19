'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResultSaveState } from '@/lib/result-workspace/actions';

export type AutosaveState =
  'idle' | 'saving' | 'saved' | 'conflict' | 'error' | 'offline';

export function useAutosave<T>({
  value,
  serverValue,
  revision,
  save,
  delayMs = 700,
}: Readonly<{
  value: T;
  serverValue: T;
  revision: string;
  save: (value: T, revision: string) => Promise<ResultSaveState>;
  delayMs?: number;
}>): Readonly<{
  status: AutosaveState;
  revision: string;
  isSaved: boolean;
  retry: () => void;
}> {
  const [status, setStatus] = useState<AutosaveState>('idle');
  const [savedRevision, setSavedRevision] = useState(revision);
  const [savedValue, setSavedValue] = useState(serverValue);
  const [cycle, setCycle] = useState(0);
  const latestValue = useRef(value);
  const lastSavedValue = useRef(serverValue);
  const revisionRef = useRef(revision);
  const propRevisionRef = useRef(revision);
  const saveRef = useRef(save);
  const timerRef = useRef<number | undefined>(undefined);
  const inFlightRef = useRef(false);

  useEffect(() => {
    latestValue.current = value;
    saveRef.current = save;
  }, [save, value]);

  const schedule = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (inFlightRef.current) return;
      if (Object.is(latestValue.current, lastSavedValue.current)) return;
      if (!window.navigator.onLine) {
        setStatus('offline');
        return;
      }

      const savingValue = latestValue.current;
      inFlightRef.current = true;
      setStatus('saving');
      void saveRef
        .current(savingValue, revisionRef.current)
        .then((result) => {
          if (result.status === 'saved') {
            revisionRef.current = result.updatedAt;
            setSavedRevision(result.updatedAt);
            lastSavedValue.current = savingValue;
            setSavedValue(savingValue);
            setStatus('saved');
            if (!Object.is(latestValue.current, savingValue)) {
              setCycle((current) => current + 1);
            }
          } else {
            setStatus(result.status);
          }
        })
        .catch(() => setStatus('error'))
        .finally(() => {
          inFlightRef.current = false;
        });
    }, delayMs);
  }, [delayMs]);

  useEffect(() => {
    if (propRevisionRef.current !== revision) {
      let active = true;
      propRevisionRef.current = revision;
      revisionRef.current = revision;
      lastSavedValue.current = serverValue;
      const dirty = !Object.is(value, serverValue);
      queueMicrotask(() => {
        if (!active) return;
        setSavedRevision(revision);
        setSavedValue(serverValue);
        setStatus(dirty ? 'saving' : 'idle');
      });
      if (dirty) schedule();
      return () => {
        active = false;
        window.clearTimeout(timerRef.current);
      };
    }
    if (!Object.is(value, lastSavedValue.current)) {
      setStatus('saving');
      schedule();
    }
    return () => window.clearTimeout(timerRef.current);
  }, [cycle, revision, schedule, serverValue, value]);

  const retry = useCallback(() => {
    if (status !== 'conflict') setCycle((current) => current + 1);
  }, [status]);

  const isSaved =
    Object.is(value, savedValue) && (status === 'idle' || status === 'saved');

  return { status, revision: savedRevision, isSaved, retry };
}
