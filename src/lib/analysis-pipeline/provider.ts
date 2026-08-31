import { z } from 'zod';

export type SafeAnalysisErrorCode =
  | 'provider_unavailable'
  | 'provider_configuration'
  | 'provider_rejected'
  | 'invalid_provider_response';

export type StructuredGenerationRequest<T> = Readonly<{
  name: string;
  system: string;
  input: string;
  jsonSchema: Readonly<Record<string, unknown>>;
  parse(value: unknown): T;
}>;

const providerIdentifierSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u);
const boundedTokenCountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(1_000_000_000);
const boundedCostSchema = z.number().nonnegative().max(1_000_000);

export const safeProviderUsageSchema = z
  .object({
    promptTokens: boundedTokenCountSchema.optional(),
    completionTokens: boundedTokenCountSchema.optional(),
    totalTokens: boundedTokenCountSchema.optional(),
    cost: boundedCostSchema.optional(),
    cachedPromptTokens: boundedTokenCountSchema.optional(),
    cacheWritePromptTokens: boundedTokenCountSchema.optional(),
    promptAudioTokens: boundedTokenCountSchema.optional(),
    reasoningTokens: boundedTokenCountSchema.optional(),
    upstreamInferenceCost: boundedCostSchema.optional(),
  })
  .strict()
  .refine((usage) => Object.keys(usage).length > 0);

export const generationMetadataSchema = z
  .object({
    requestId: providerIdentifierSchema.nullable(),
    model: providerIdentifierSchema.nullable(),
    usage: safeProviderUsageSchema.nullable(),
    latencyMs: z.number().int().nonnegative().max(3_600_000),
  })
  .strict();

export type SafeProviderUsage = z.infer<typeof safeProviderUsageSchema>;
export type GenerationMetadata = z.infer<typeof generationMetadataSchema>;

export type GenerationResult<T> = Readonly<{
  value: T;
  metadata: Readonly<GenerationMetadata>;
}>;

export type StructuredGenerationProvider = Readonly<{
  generate<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<GenerationResult<T>>;
}>;

export class ProviderError extends Error {
  constructor(
    readonly code: SafeAnalysisErrorCode,
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
    readonly generationMetadata?: GenerationMetadata,
  ) {
    super(code);
    this.name = 'ProviderError';
  }
}
