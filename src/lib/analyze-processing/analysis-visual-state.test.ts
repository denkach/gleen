import { describe, expect, test } from 'vitest';
import {
  artifactRayDefinitions,
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

  test('defines rays only for supported intake artifacts', () => {
    expect(Object.keys(artifactRayDefinitions)).toEqual([
      'summary',
      'flashcards',
      'timestamps',
      'transcript',
    ]);
    expect(artifactRayDefinitions.transcript).toMatchObject({
      label: 'TRANSCRIPT',
      tone: 'neutral',
    });
    expect(artifactRayDefinitions).toEqual({
      summary: {
        label: 'SUMMARY',
        tone: 'summary',
        angle: '-15deg',
        labelTop: '13px',
      },
      flashcards: {
        label: 'FLASHCARDS',
        tone: 'flashcards',
        angle: '-5deg',
        labelTop: '50px',
      },
      timestamps: {
        label: 'TIMESTAMPS',
        tone: 'timestamps',
        angle: '7deg',
        labelTop: '88px',
      },
      transcript: {
        label: 'TRANSCRIPT',
        tone: 'neutral',
        angle: '18deg',
        labelTop: '126px',
      },
    });
  });
});
