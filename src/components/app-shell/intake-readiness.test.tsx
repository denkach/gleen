import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

import { IntakeReadiness } from './intake-readiness';

const readyIntake: AnalysisIntake = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  youtubeVideoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'How prisms separate light',
  channelTitle: 'Quiet Science',
  durationSeconds: 754,
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  transcriptLanguage: 'en',
  transcriptSegments: [
    { text: 'Private transcript content', offsetMs: 0, durationMs: 1200 },
  ],
  configuration: {
    outputLocale: 'es',
    summaryPreset: 'detailed',
    flashcardPreset: 18,
    artifacts: ['flashcards', 'summary', 'timestamps'],
    analysisContractVersion: 1,
  },
  duplicateKey: 'a'.repeat(64),
  attempt: 1,
  status: 'ready',
  reanalysisOf: null,
  createdAt: '2026-07-12T10:00:00.000Z',
};

describe('IntakeReadiness', () => {
  test('presents the validated intake and its processing readiness', () => {
    render(<IntakeReadiness intake={readyIntake} />);

    expect(
      screen.getByRole('heading', { name: readyIntake.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(readyIntake.channelTitle)).toBeInTheDocument();
    expect(screen.getByText('12:34')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('Detailed')).toBeInTheDocument();
    expect(screen.getByText('18 cards')).toBeInTheDocument();
    expect(screen.getByText('Ready for processing')).toBeInTheDocument();
    expect(
      screen.getByText(/processing is implemented in the next issue/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new analysis/i })).toHaveAttribute(
      'href',
      '/app',
    );
  });

  test('does not expose transcript content or claim artifacts were generated', () => {
    render(<IntakeReadiness intake={readyIntake} />);

    expect(
      screen.queryByText('Private transcript content'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/generated summary/i)).not.toBeInTheDocument();
  });
});
