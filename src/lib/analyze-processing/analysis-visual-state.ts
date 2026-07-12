import type { IntakeConfiguration } from '@/lib/youtube-intake/configuration';

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

export type Artifact = IntakeConfiguration['artifacts'][number];

export type ArtifactRayDefinition = Readonly<{
  label: string;
  tone: 'summary' | 'flashcards' | 'timestamps' | 'neutral';
  angle: `${number}deg`;
  labelTop: `${number}px`;
}>;

export const orderedAnalysisStages: readonly AnalysisStage[] = [
  { id: 'validating', label: 'Validating video' },
  { id: 'transcript', label: 'Finding transcript' },
  { id: 'structuring', label: 'Structuring key ideas' },
  { id: 'artifacts', label: 'Creating knowledge artifacts' },
];

export const artifactRayDefinitions = {
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
} as const satisfies Readonly<Record<Artifact, ArtifactRayDefinition>>;

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
        title: 'Analysis complete',
        subtitle: 'Your knowledge artifacts are ready.',
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
