import { z } from 'zod';

import {
  summaryArtifactV3Schema,
  summarySectionSchema,
  type SummaryArtifactV3,
} from './artifact-schemas';

const nonemptyTextSchema = z.string().trim().min(1);

const summaryIdeaSchema = z
  .object({
    id: nonemptyTextSchema,
    importance: z.enum(['high', 'medium', 'low']),
    topic: nonemptyTextSchema,
    claim: nonemptyTextSchema,
    evidence: z.array(nonemptyTextSchema).min(1),
    caveats: z.array(nonemptyTextSchema),
    relationships: z.array(nonemptyTextSchema),
    sourceOffsetsMs: z.array(z.number().int().nonnegative()).min(1),
  })
  .strict();

export const summaryIdeaMapSchema = z
  .object({
    ideas: z.array(summaryIdeaSchema).min(1).max(60),
  })
  .strict()
  .superRefine((value, context) => {
    const seenIds = new Set<string>();

    value.ideas.forEach((idea, index) => {
      if (seenIds.has(idea.id)) {
        context.addIssue({
          code: 'custom',
          path: ['ideas', index, 'id'],
          message: 'Idea IDs must be unique',
        });
      }
      seenIds.add(idea.id);
    });
  });

const composedSummarySectionSchema = summarySectionSchema
  .extend({
    coveredIdeaIds: z.array(nonemptyTextSchema).min(1),
  })
  .superRefine((section, context) => {
    const seenIds = new Set<string>();

    section.coveredIdeaIds.forEach((ideaId, index) => {
      if (seenIds.has(ideaId)) {
        context.addIssue({
          code: 'custom',
          path: ['coveredIdeaIds', index],
          message: 'Covered idea IDs must be unique',
        });
      }
      seenIds.add(ideaId);
    });
  });

export const composedSummarySchema = summaryArtifactV3Schema.extend({
  sections: z.array(composedSummarySectionSchema).min(1).max(20),
});

export type SummaryIdeaMap = z.infer<typeof summaryIdeaMapSchema>;
export type ComposedSummary = z.infer<typeof composedSummarySchema>;

export function toSummaryArtifact(value: ComposedSummary): SummaryArtifactV3 {
  return {
    schemaVersion: 3,
    title: value.title,
    outcome: value.outcome,
    sections: value.sections.map((section) => {
      const { coveredIdeaIds, ...artifactSection } = section;
      void coveredIdeaIds;
      return artifactSection;
    }),
  };
}

export const summaryIdeaMapJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ideas'],
  properties: {
    ideas: {
      type: 'array',
      minItems: 1,
      maxItems: 60,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'importance',
          'topic',
          'claim',
          'evidence',
          'caveats',
          'relationships',
          'sourceOffsetsMs',
        ],
        properties: {
          id: { type: 'string', minLength: 1 },
          importance: { type: 'string', enum: ['high', 'medium', 'low'] },
          topic: { type: 'string', minLength: 1 },
          claim: { type: 'string', minLength: 1 },
          evidence: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 1 },
          },
          caveats: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          relationships: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          sourceOffsetsMs: {
            type: 'array',
            minItems: 1,
            items: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
  },
} as const;

export const composedSummaryJsonSchema = {
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
          'coveredIdeaIds',
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
          coveredIdeaIds: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  },
} as const;
