import { z } from 'zod';

export const summaryArtifactV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(1),
    overview: z.string().trim().min(1),
    keyPoints: z.array(z.string().trim().min(1)).min(1).max(20),
  })
  .strict();

export const summaryArtifactV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    title: z.string().trim().min(1),
    overview: z.string().trim().min(1),
    keyPoints: z
      .array(
        z
          .object({
            text: z.string().trim().min(1),
            sourceOffsetMs: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

export const summarySectionSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    details: z.string().trim().min(1),
    supportingQuote: z.string().trim().min(1).nullable(),
    sourceOffsetMs: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const summaryArtifactV3Schema = z
  .object({
    schemaVersion: z.literal(3),
    title: z.string().trim().min(1),
    outcome: z.string().trim().min(1),
    sections: z.array(summarySectionSchema).min(1).max(20),
  })
  .strict();

export const summaryArtifactSchema = z.discriminatedUnion('schemaVersion', [
  summaryArtifactV1Schema,
  summaryArtifactV2Schema,
  summaryArtifactV3Schema,
]);

const transcriptSourceTextSchema = z
  .string()
  .refine((text) => text.trim().length > 0, 'Transcript text is required');

export const transcriptSegmentV1Schema = z
  .object({
    text: transcriptSourceTextSchema,
    offsetMs: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  })
  .strict();

export const transcriptSegmentV2Schema = z
  .object({
    text: transcriptSourceTextSchema,
    offsetMs: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    segmentType: z.enum(['insight', 'question', 'example', 'story', 'other']),
    speakerLabel: z.string().trim().min(1).nullable(),
  })
  .strict();

export const transcriptArtifactV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    language: z.string().trim().min(1),
    segments: z.array(transcriptSegmentV1Schema),
  })
  .strict();

export const transcriptArtifactV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    language: z.string().trim().min(1),
    segments: z.array(transcriptSegmentV2Schema),
  })
  .strict();

export const transcriptArtifactSchema = z.discriminatedUnion('schemaVersion', [
  transcriptArtifactV1Schema,
  transcriptArtifactV2Schema,
]);

export const flashcardsArtifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    cards: z
      .array(
        z
          .object({
            front: z.string().trim().min(1),
            back: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

export const timestampsArtifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    chapters: z
      .array(
        z
          .object({
            offsetMs: z.number().int().nonnegative(),
            title: z.string().trim().min(1),
            description: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((artifact, context) => {
    artifact.chapters.forEach((chapter, index) => {
      const previous = artifact.chapters[index - 1];
      if (previous && chapter.offsetMs <= previous.offsetMs) {
        context.addIssue({
          code: 'custom',
          path: ['chapters', index, 'offsetMs'],
          message: 'Chapter offsets must be strictly increasing',
        });
      }
    });
  });

export type SummaryArtifact = z.infer<typeof summaryArtifactSchema>;
export type FlashcardsArtifact = z.infer<typeof flashcardsArtifactSchema>;
export type TimestampsArtifact = z.infer<typeof timestampsArtifactSchema>;
export type TranscriptArtifact = z.infer<typeof transcriptArtifactSchema>;

export const summaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'title', 'outcome', 'sections'],
  properties: {
    schemaVersion: { type: 'integer', const: 3 },
    title: { type: 'string', minLength: 1 },
    outcome: { type: 'string', minLength: 1 },
    sections: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'summary',
          'details',
          'supportingQuote',
          'sourceOffsetMs',
        ],
        properties: {
          title: { type: 'string', minLength: 1 },
          summary: { type: 'string', minLength: 1 },
          details: { type: 'string', minLength: 1 },
          supportingQuote: {
            anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }],
          },
          sourceOffsetMs: {
            anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
          },
        },
      },
    },
  },
} as const;

export const flashcardsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'cards'],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    cards: {
      type: 'array',
      minItems: 1,
      maxItems: 30,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['front', 'back'],
        properties: {
          front: { type: 'string', minLength: 1 },
          back: { type: 'string', minLength: 1 },
        },
      },
    },
  },
} as const;

export const timestampsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'chapters'],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    chapters: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['offsetMs', 'title', 'description'],
        properties: {
          offsetMs: { type: 'integer', minimum: 0 },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
        },
      },
    },
  },
} as const;
