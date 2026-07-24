import { z } from 'zod';

import {
  flashcardsArtifactSchema,
  summaryArtifactSchema,
  timestampsArtifactSchema,
} from '@/lib/analysis-pipeline/artifact-schemas';

const editIdentitySchema = z.object({
  analysisId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export const resultTitleEditSchema = editIdentitySchema
  .extend({ title: z.string().trim().min(1).max(300) })
  .strict();

export const resultArtifactEditSchema = z.discriminatedUnion('kind', [
  editIdentitySchema
    .extend({ kind: z.literal('summary'), content: summaryArtifactSchema })
    .strict(),
  editIdentitySchema
    .extend({
      kind: z.literal('flashcards'),
      content: flashcardsArtifactSchema,
    })
    .strict(),
  editIdentitySchema
    .extend({
      kind: z.literal('timestamps'),
      content: timestampsArtifactSchema,
    })
    .strict(),
]);

export type ResultTitleEdit = z.infer<typeof resultTitleEditSchema>;
export type ResultArtifactEdit = z.infer<typeof resultArtifactEditSchema>;
