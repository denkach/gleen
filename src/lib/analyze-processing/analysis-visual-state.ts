export type AnalysisVisualState =
  | 'idle'
  | 'submitting'
  | 'validating'
  | 'transcript'
  | 'structuring'
  | 'artifacts'
  | 'complete'
  | 'error';

export type AnalysisStageId =
  'validating' | 'transcript' | 'structuring' | 'artifacts';

export type AnalysisStage = Readonly<{
  id: AnalysisStageId;
}>;

export type AnalysisVisualPresentation = Readonly<{
  mode: 'idle' | 'processing' | 'complete' | 'error';
  activeStage: AnalysisStageId | null;
  completedStages: readonly AnalysisStageId[];
}>;

export type ArtifactRailDefinition = Readonly<{
  id: 'summary' | 'flashcards' | 'timestamps' | 'export';
  tone: 'summary' | 'flashcards' | 'timestamps' | 'export';
}>;

export const orderedAnalysisStages: readonly AnalysisStage[] = [
  { id: 'validating' },
  { id: 'transcript' },
  { id: 'structuring' },
  { id: 'artifacts' },
];

export const artifactRailDefinitions = [
  {
    id: 'summary',
    tone: 'summary',
  },
  {
    id: 'flashcards',
    tone: 'flashcards',
  },
  {
    id: 'timestamps',
    tone: 'timestamps',
  },
  {
    id: 'export',
    tone: 'export',
  },
] as const satisfies readonly ArtifactRailDefinition[];

export function getAnalysisVisualPresentation(
  state: AnalysisVisualState,
): AnalysisVisualPresentation {
  switch (state) {
    case 'idle':
      return {
        mode: 'idle',
        activeStage: null,
        completedStages: [],
      };
    case 'submitting':
      return {
        mode: 'processing',
        activeStage: null,
        completedStages: [],
      };
    case 'validating':
      return {
        mode: 'processing',
        activeStage: 'validating',
        completedStages: [],
      };
    case 'transcript':
      return {
        mode: 'processing',
        activeStage: 'transcript',
        completedStages: ['validating'],
      };
    case 'structuring':
      return {
        mode: 'processing',
        activeStage: 'structuring',
        completedStages: ['validating', 'transcript'],
      };
    case 'artifacts':
      return {
        mode: 'processing',
        activeStage: 'artifacts',
        completedStages: ['validating', 'transcript', 'structuring'],
      };
    case 'complete':
      return {
        mode: 'complete',
        activeStage: null,
        completedStages: [
          'validating',
          'transcript',
          'structuring',
          'artifacts',
        ],
      };
    case 'error':
      return {
        mode: 'error',
        activeStage: null,
        completedStages: [],
      };
    default: {
      const exhaustiveState: never = state;
      return exhaustiveState;
    }
  }
}
