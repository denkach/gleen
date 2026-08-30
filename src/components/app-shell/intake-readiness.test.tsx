import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { ComponentProps } from 'react';

import type { AnalysisIntake } from '@/lib/youtube-intake/repository';
import { appMessages } from '@/lib/i18n/messages/app';

import { IntakeReadiness as LocalizedIntakeReadiness } from './intake-readiness';

function IntakeReadiness({
  copy = appMessages.en,
  locale = 'en',
  ...props
}: Omit<ComponentProps<typeof LocalizedIntakeReadiness>, 'copy' | 'locale'> &
  Partial<
    Pick<ComponentProps<typeof LocalizedIntakeReadiness>, 'copy' | 'locale'>
  >) {
  return <LocalizedIntakeReadiness copy={copy} locale={locale} {...props} />;
}

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
    summaryPreset: 'deep',
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
    render(
      <IntakeReadiness
        copy={appMessages.uk}
        intake={readyIntake}
        locale="uk"
      />,
    );

    expect(
      screen.getByRole('heading', { name: readyIntake.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(readyIntake.channelTitle)).toBeInTheDocument();
    expect(screen.getByText('12:34')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Докладний')).toBeInTheDocument();
    expect(screen.getByText('18 карток')).toBeInTheDocument();
    expect(screen.getByText('Готово до обробки')).toBeInTheDocument();
    expect(
      screen.getByText(/обробку буде реалізовано в наступному завданні/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /нового аналізу/i }),
    ).toHaveAttribute('href', '/app');
  });

  test('does not expose transcript content or claim artifacts were generated', () => {
    render(<IntakeReadiness intake={readyIntake} />);

    expect(
      screen.queryByText('Private transcript content'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/generated summary/i)).not.toBeInTheDocument();
  });
});
