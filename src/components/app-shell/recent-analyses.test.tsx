import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HistoryItem } from '@/lib/history/repository';
import { appMessages } from '@/lib/i18n/messages/app';
import { RecentAnalyses } from './recent-analyses';

const item: HistoryItem = {
  id: 'analysis-1',
  sourceId: 'video-1',
  href: '/app/video/analysis-1',
  title: 'Systems Thinking',
  channel: 'Frame School',
  thumbnailUrl: 'https://i.ytimg.com/vi/video-1/hqdefault.jpg',
  source: 'https://youtube.com/watch?v=video-1',
  language: 'English',
  outputLocale: 'en',
  summaryPresetLabel: 'Deep',
  durationSeconds: 2829,
  durationLabel: '47:09',
  analyzedAt: '2026-07-06T09:12:00.000Z',
  analyzedAtLabel: 'Jul 6, 2026',
  lastOpenedAt: null,
  lastOpenedAtLabel: null,
  status: { key: 'partial', label: 'Partially ready' },
  favorite: false,
  selectedArtifacts: ['summary', 'flashcards'],
  readyArtifacts: ['summary'],
  canExport: true,
  titleRevision: 'rev-1',
};

describe('RecentAnalyses', () => {
  it('renders persisted item details and destination', () => {
    render(
      <RecentAnalyses
        artifacts={appMessages.en.newAnalysis.artifacts}
        copy={appMessages.en.newAnalysis.recent}
        state={{ kind: 'ready', items: [item] }}
      />,
    );
    expect(
      screen.getByRole('link', { name: /Systems Thinking/u }),
    ).toHaveAttribute('href', '/app/video/analysis-1');
    expect(screen.getByText(/Frame School/)).toBeVisible();
    expect(screen.getByText('Deep')).toBeVisible();
    expect(screen.getByText('Partially ready')).toBeVisible();
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      item.thumbnailUrl,
    );
    const destination = screen.getByRole('link', {
      name: /Systems Thinking/u,
    });
    expect(within(destination).getByText('47:09')).toBeVisible();
    expect(within(destination).getByText('Summary')).toBeVisible();
    expect(within(destination).getByText('Flashcards')).toBeVisible();
  });

  it('keeps distinct empty and unavailable recovery states', () => {
    const { rerender } = render(
      <RecentAnalyses
        artifacts={appMessages.en.newAnalysis.artifacts}
        copy={appMessages.en.newAnalysis.recent}
        state={{ kind: 'ready', items: [] }}
      />,
    );
    expect(screen.getByText('No analyses yet')).toBeVisible();
    rerender(
      <RecentAnalyses
        artifacts={appMessages.en.newAnalysis.artifacts}
        copy={appMessages.en.newAnalysis.recent}
        state={{ kind: 'unavailable' }}
      />,
    );
    expect(
      screen.getByText('Recent analyses are temporarily unavailable'),
    ).toBeVisible();
  });
});
