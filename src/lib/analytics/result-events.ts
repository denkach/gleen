import { z } from 'zod';

import { resultArtifacts } from '@/lib/result-workspace/navigation';

const resultArtifactSchema = z.enum(resultArtifacts);
const anonymousAnalysisIdSchema = z.string().trim().min(1).max(128);

export const resultEventSchema = z.discriminatedUnion('name', [
  z
    .object({
      name: z.literal('result_overview_artifact_opened'),
      artifact: resultArtifactSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('result_continue_watching_clicked'),
      anonymousAnalysisId: anonymousAnalysisIdSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('result_mobile_miniplayer_shown'),
      anonymousAnalysisId: anonymousAnalysisIdSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('result_mobile_miniplayer_expanded'),
      anonymousAnalysisId: anonymousAnalysisIdSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('result_chapter_sheet_opened'),
      anonymousAnalysisId: anonymousAnalysisIdSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('result_mobile_tab_changed'),
      artifact: resultArtifactSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('result_chapter_selected'),
      anonymousAnalysisId: anonymousAnalysisIdSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('result_favorite_changed'),
      favorite: z.boolean(),
    })
    .strict(),
  z
    .object({
      name: z.literal('result_share_changed'),
      action: z.enum(['created', 'copied', 'revoked']),
    })
    .strict(),
  z
    .object({
      name: z.literal('result_transcript_control_changed'),
      control: z.enum(['filter', 'auto_scroll', 'speaker_labels']),
    })
    .strict(),
  z
    .object({
      name: z.literal('result_playback_rate_changed'),
      rate: z.number().finite().positive(),
    })
    .strict(),
  z
    .object({
      name: z.literal('result_export_requested'),
      destination: z.enum(['markdown', 'obsidian', 'notebooklm', 'notion']),
    })
    .strict(),
]);

export type ResultEvent = z.infer<typeof resultEventSchema>;

export function trackResultEvent(event: ResultEvent): void {
  const validatedEvent = resultEventSchema.safeParse(event);
  if (!validatedEvent.success) {
    throw new TypeError('Invalid result analytics event');
  }
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gleen:analytics', { detail: validatedEvent.data }),
  );
}
