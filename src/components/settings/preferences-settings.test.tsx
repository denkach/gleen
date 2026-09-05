import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/settings/actions', () => ({
  setSummaryMode: vi.fn(),
  setFlashcardPreset: vi.fn(),
}));

import { settingsMessages } from '@/lib/i18n/messages/settings';
import { PreferencesSettings } from './preferences-settings';

describe('preferences settings', () => {
  it('renders independent summary and flashcard forms', () => {
    render(
      <PreferencesSettings
        copy={settingsMessages.en}
        flashcardPreset={18}
        summaryMode="balanced"
      />,
    );
    expect(screen.getByLabelText('Default summary mode')).toHaveValue(
      'balanced',
    );
    expect(screen.getByLabelText('Default flashcard count')).toHaveValue('18');
    expect(screen.getAllByRole('form')).toHaveLength(2);
  });
});
