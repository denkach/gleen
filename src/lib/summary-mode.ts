import { z } from 'zod';

export const summaryModeSchema = z.enum(['compact', 'balanced', 'deep']);
export type SummaryMode = z.infer<typeof summaryModeSchema>;

export const storedSummaryModeSchema = z
  .enum(['compact', 'balanced', 'deep', 'detailed'])
  .transform((value): SummaryMode => (value === 'detailed' ? 'deep' : value));

export function normalizeStoredSummaryMode(value: unknown): SummaryMode {
  return storedSummaryModeSchema.parse(value);
}
