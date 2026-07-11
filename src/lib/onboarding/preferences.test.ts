import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  interfaceLocaleSchema,
  onboardingStateSchema,
  outputLocaleSchema,
  outputPreferencesSchema,
} from './preferences';

describe('onboarding preferences', () => {
  it('accepts the five approved interface and output locales', () => {
    for (const locale of ['uk', 'ru', 'en', 'es', 'de']) {
      expect(interfaceLocaleSchema.parse(locale)).toBe(locale);
      expect(outputLocaleSchema.parse(locale)).toBe(locale);
    }
  });

  it('rejects unsupported locales and output defaults', () => {
    expect(interfaceLocaleSchema.safeParse('fr').success).toBe(false);
    expect(
      outputPreferencesSchema.safeParse({
        summaryPreset: 'short',
        flashcardPreset: 12,
      }).success,
    ).toBe(false);
  });

  it('parses a complete resumable onboarding state', () => {
    expect(
      onboardingStateSchema.parse({
        interfaceLocale: 'en',
        outputLocale: 'de',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        onboardingStep: 2,
        onboardingCompletedAt: null,
      }),
    ).toEqual({
      interfaceLocale: 'en',
      outputLocale: 'de',
      summaryPreset: 'balanced',
      flashcardPreset: 18,
      onboardingStep: 2,
      onboardingCompletedAt: null,
    });
  });

  it('defines ownership constraints and RLS in the migration', async () => {
    const migration = await readFile(
      join(
        process.cwd(),
        'supabase/migrations/202607120001_create_profiles.sql',
      ),
      'utf8',
    );

    expect(migration).toMatch(/references auth\.users\s*\(id\)/i);
    expect(migration).toMatch(/enable row level security/i);
    expect(migration).toMatch(/auth\.uid\(\) = user_id/g);
    expect(migration).toMatch(
      /interface_locale in \('uk', 'ru', 'en', 'es', 'de'\)/i,
    );
    expect(migration).toMatch(/flashcard_preset in \(18, 30\)/i);
  });
});
