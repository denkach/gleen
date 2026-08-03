import { describe, expect, test } from 'vitest';
import {
  artifactRailDefinitions,
  getAnalysisVisualPresentation,
  orderedAnalysisStages,
} from './analysis-visual-state';

describe('getAnalysisVisualPresentation', () => {
  test('keeps production submitting honest and does not fabricate completed stages', () => {
    expect(getAnalysisVisualPresentation('submitting')).toEqual({
      mode: 'processing',
      activeStage: null,
      completedStages: [],
    });
  });

  test.each([
    ['validating', 'validating', []],
    ['transcript', 'transcript', ['validating']],
    ['structuring', 'structuring', ['validating', 'transcript']],
    ['artifacts', 'artifacts', ['validating', 'transcript', 'structuring']],
  ] as const)(
    'maps %s only from an application-provided state',
    (state, activeStage, completedStages) => {
      expect(getAnalysisVisualPresentation(state)).toMatchObject({
        activeStage,
        completedStages,
      });
    },
  );

  test('uses stable ordered stage identities', () => {
    expect(orderedAnalysisStages.map((stage) => stage.id)).toEqual([
      'validating',
      'transcript',
      'structuring',
      'artifacts',
    ]);
  });

  test('defines the four approved semantic rails without optical geometry', () => {
    expect(artifactRailDefinitions).toEqual([
      { id: 'summary', tone: 'summary' },
      { id: 'flashcards', tone: 'flashcards' },
      { id: 'timestamps', tone: 'timestamps' },
      { id: 'export', tone: 'export' },
    ]);
  });
});
