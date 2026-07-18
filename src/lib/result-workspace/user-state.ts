import { z } from 'zod';

export const resultArtifactSchema = z.enum([
  'overview',
  'summary',
  'flashcards',
  'timestamps',
  'transcript',
  'export',
]);

export const flashcardRatingSchema = z.enum(['again', 'hard', 'got_it']);

export const lastStudyActionSchema = z.enum([
  'summary_opened',
  'flashcards_reviewed',
  'transcript_used',
]);

export type FlashcardRating = z.infer<typeof flashcardRatingSchema>;

export type ResultUserState = Readonly<{
  favorite: boolean;
  playbackPositionMs: number;
  lastArtifact: z.infer<typeof resultArtifactSchema>;
  lastStudyAction: z.infer<typeof lastStudyActionSchema> | null;
  reviews: readonly Readonly<{
    artifactRevision: string;
    cardIndex: number;
    rating: FlashcardRating;
  }>[];
}>;

export const defaultResultUserState: ResultUserState = {
  favorite: false,
  playbackPositionMs: 0,
  lastArtifact: 'overview',
  lastStudyAction: null,
  reviews: [],
};
