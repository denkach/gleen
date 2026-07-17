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
      title: 'Analyzing your video',
      subtitle: 'Checking video and transcript…',
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

  test('uses the approved ordered stage labels', () => {
    expect(orderedAnalysisStages.map((stage) => stage.label)).toEqual([
      'Validating video',
      'Finding transcript',
      'Structuring key ideas',
      'Creating knowledge artifacts',
    ]);
  });

  test('defines the four approved semantic rails without optical geometry', () => {
    expect(artifactRailDefinitions).toEqual([
      { id: 'summary', label: 'SUMMARY', tone: 'summary' },
      { id: 'flashcards', label: 'FLASHCARDS', tone: 'flashcards' },
      { id: 'timestamps', label: 'TIMESTAMPS', tone: 'timestamps' },
      { id: 'export', label: 'EXPORT', tone: 'export' },
    ]);
  });
});
