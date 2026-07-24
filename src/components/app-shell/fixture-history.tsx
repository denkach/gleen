'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { historyEntryPresentation } from '@/lib/analysis-pipeline/recovery';
import { createSessionRecoveryRepositories } from '@/lib/analysis-pipeline/session-recovery-repository';

export function FixtureHistory() {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void createSessionRecoveryRepositories(window.sessionStorage)
      .analysisRepository.findMostRecentOwnedActive('fixture-user')
      .then((active) => {
        setActiveId(active?.intake.id ?? null);
      });
  }, []);

  if (!activeId) return <p>No active analyses.</p>;
  const presentation = historyEntryPresentation(
    { id: activeId, status: 'running' },
    { app: '/app-shell-fixture', result: '/app-shell-fixture/app/video' },
  );
  return <Link href={presentation.href}>Resume active analysis</Link>;
}
