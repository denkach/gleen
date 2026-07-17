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
  label: string;
}>;

export type AnalysisVisualPresentation = Readonly<{
  mode: 'idle' | 'processing' | 'complete' | 'error';
  title: string;
  subtitle: string;
  activeStage: AnalysisStageId | null;
  completedStages: readonly AnalysisStageId[];
}>;

export type ArtifactRailDefinition = Readonly<{
  id: 'summary' | 'flashcards' | 'timestamps' | 'export';
  label: string;
  tone: 'summary' | 'flashcards' | 'timestamps' | 'export';
}>;

export const orderedAnalysisStages: readonly AnalysisStage[] = [
  { id: 'validating', label: 'Validating video' },
  { id: 'transcript', label: 'Finding transcript' },
  { id: 'structuring', label: 'Structuring key ideas' },
  { id: 'artifacts', label: 'Creating knowledge artifacts' },
];

export const artifactRailDefinitions = [
  {
    id: 'summary',
    label: 'SUMMARY',
    tone: 'summary',
  },
  {
    id: 'flashcards',
    label: 'FLASHCARDS',
    tone: 'flashcards',
  },
  {
    id: 'timestamps',
    label: 'TIMESTAMPS',
    tone: 'timestamps',
  },
  {
    id: 'export',
    label: 'EXPORT',
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
        title: 'Analyze your video',
        subtitle: 'Paste a YouTube URL to begin.',
        activeStage: null,
        completedStages: [],
      };
    case 'submitting':
      return {
        mode: 'processing',
        title: 'Analyzing your video',
        subtitle: 'Checking video and transcript…',
        activeStage: null,
        completedStages: [],
      };
    case 'validating':
      return {
        mode: 'processing',
        title: 'Analyzing your video',
        subtitle: 'Validating the source.',
        activeStage: 'validating',
        completedStages: [],
      };
    case 'transcript':
      return {
        mode: 'processing',
        title: 'Analyzing your video',
        subtitle: 'Finding the transcript.',
        activeStage: 'transcript',
        completedStages: ['validating'],
      };
    case 'structuring':
      return {
        mode: 'processing',
        title: 'Finding the signal',
        subtitle: 'Structuring key ideas.',
        activeStage: 'structuring',
        completedStages: ['validating', 'transcript'],
      };
    case 'artifacts':
      return {
        mode: 'processing',
        title: 'Separating the spectrum',
        subtitle: 'Creating your knowledge artifacts.',
        activeStage: 'artifacts',
        completedStages: ['validating', 'transcript', 'structuring'],
      };
    case 'complete':
      return {
        mode: 'complete',
        title: 'Your artifacts are ready',
        subtitle: 'Opening the result workspace',
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
        title: 'We couldn’t access this video.',
        subtitle: 'Check that it is public and try again.',
        activeStage: null,
        completedStages: [],
      };
    default: {
      const exhaustiveState: never = state;
      return exhaustiveState;
    }
  }
}
