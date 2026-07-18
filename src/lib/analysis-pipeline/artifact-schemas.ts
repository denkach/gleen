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

export const summaryArtifactSchema = z.discriminatedUnion('schemaVersion', [
  summaryArtifactV1Schema,
  summaryArtifactV2Schema,
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
  .strict();

export type SummaryArtifact = z.infer<typeof summaryArtifactSchema>;
export type FlashcardsArtifact = z.infer<typeof flashcardsArtifactSchema>;
export type TimestampsArtifact = z.infer<typeof timestampsArtifactSchema>;

export const summaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'title', 'overview', 'keyPoints'],
  properties: {
    schemaVersion: { type: 'integer', const: 2 },
    title: { type: 'string', minLength: 1 },
    overview: { type: 'string', minLength: 1 },
    keyPoints: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'sourceOffsetMs'],
        properties: {
          text: { type: 'string', minLength: 1 },
          sourceOffsetMs: { type: 'integer', minimum: 0 },
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
