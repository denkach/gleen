import { describe, expect, test } from 'vitest';

import { supportedLocales } from '@/lib/onboarding/preferences';

import { resultCopy, type ResultCopy } from './copy';

describe('result workspace copy', () => {
  test('provides the complete English contract in every interface locale', () => {
    const englishKeys = Object.keys(resultCopy.en).sort();

    for (const locale of supportedLocales) {
      expect(Object.keys(resultCopy[locale]).sort()).toEqual(englishKeys);
      expect(Object.values(resultCopy[locale])).not.toContain('');
    }
  });

  test('keeps the dictionary closed and usable as the ResultCopy contract', () => {
    const copy: ResultCopy = resultCopy.uk;

    expect(copy.tabOverview).toBe('Огляд');
    expect(copy.favoriteAdd).toBeTruthy();
    expect(copy.sharePublicReadOnly).toBeTruthy();
    expect(copy.stateMalformed).toBeTruthy();
    expect(copy.sourceLabel).toBe('Джерело відео');
    expect(copy.currentChapter).toBe('Поточний розділ');
    expect(copy.keyMomentsCountOne).toContain('{count}');
    expect(copy.keyMomentsCountFew).toContain('{count}');
    expect(copy.keyMomentsCountMany).toContain('{count}');
    expect(copy.keyMomentsCountOther).toContain('{count}');
    expect(copy.playerProgressValue).toContain('{current}');
    expect(copy.playerVolumeValue).toContain('{percent}');
  });
});
