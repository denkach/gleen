import { z } from 'zod';

import {
  generationMetadataSchema,
  ProviderError,
  safeProviderUsageSchema,
  type StructuredGenerationProvider,
  type StructuredGenerationRequest,
} from './provider';

type OpenRouterProviderOptions = Readonly<{
  apiKey: string;
  model: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  onDiagnostic?: (diagnostic: OpenRouterHttpDiagnostic) => void;
}>;

type OpenRouterHttpDiagnostic = Readonly<{
  event: 'analysis_provider_http_error';
  provider: 'openrouter';
  requestName: string;
  httpStatus: number;
  errorCode: ProviderError['code'];
  retryable: boolean;
  attempt: number;
  willRetry: boolean;
}>;

const retryableStatuses = new Set([408, 429, 500, 502, 503, 504, 524, 529]);
const defaultRetryDelayMs = 250;
const maxRetryDelayMs = 5_000;

const rawTokenCountSchema = z.number().int().nonnegative().max(1_000_000_000);
const rawCostSchema = z.number().nonnegative().max(1_000_000);
const rawUsageSchema = z
  .object({
    prompt_tokens: rawTokenCountSchema.optional(),
    completion_tokens: rawTokenCountSchema.optional(),
    total_tokens: rawTokenCountSchema.optional(),
    cost: rawCostSchema.optional(),
    prompt_tokens_details: z
      .object({
        cached_tokens: rawTokenCountSchema.optional(),
        cache_write_tokens: rawTokenCountSchema.optional(),
        audio_tokens: rawTokenCountSchema.optional(),
      })
      .strip()
      .optional(),
    completion_tokens_details: z
      .object({ reasoning_tokens: rawTokenCountSchema.optional() })
      .strip()
      .optional(),
    cost_details: z
      .object({
        upstream_inference_cost: rawCostSchema.nullable().optional(),
      })
      .strip()
      .optional(),
  })
  .strip()
  .transform((usage) =>
    safeProviderUsageSchema.parse({
      ...(usage.prompt_tokens === undefined
        ? {}
        : { promptTokens: usage.prompt_tokens }),
      ...(usage.completion_tokens === undefined
        ? {}
        : { completionTokens: usage.completion_tokens }),
      ...(usage.total_tokens === undefined
        ? {}
        : { totalTokens: usage.total_tokens }),
      ...(usage.cost === undefined ? {} : { cost: usage.cost }),
      ...(usage.prompt_tokens_details?.cached_tokens === undefined
        ? {}
        : {
            cachedPromptTokens: usage.prompt_tokens_details.cached_tokens,
          }),
      ...(usage.prompt_tokens_details?.cache_write_tokens === undefined
        ? {}
        : {
            cacheWritePromptTokens:
              usage.prompt_tokens_details.cache_write_tokens,
          }),
      ...(usage.prompt_tokens_details?.audio_tokens === undefined
        ? {}
        : { promptAudioTokens: usage.prompt_tokens_details.audio_tokens }),
      ...(usage.completion_tokens_details?.reasoning_tokens === undefined
        ? {}
        : {
            reasoningTokens: usage.completion_tokens_details.reasoning_tokens,
          }),
      ...(typeof usage.cost_details?.upstream_inference_cost !== 'number'
        ? {}
        : {
            upstreamInferenceCost: usage.cost_details.upstream_inference_cost,
          }),
    }),
  );

function retryAfterMs(response: Response): number | undefined {
  const seconds = Number(response.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1000, maxRetryDelayMs)
    : undefined;
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

function reportDiagnostic(diagnostic: OpenRouterHttpDiagnostic) {
  console.error(diagnostic);
}

function safeRequestName(value: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u.test(value) ? value : 'unknown';
}

function responseError(response: Response): ProviderError {
  if (retryableStatuses.has(response.status)) {
    return new ProviderError(
      'provider_unavailable',
      true,
      retryAfterMs(response),
    );
  }
  if (response.status === 401 || response.status === 402) {
    return new ProviderError('provider_configuration', false);
  }
  return new ProviderError('provider_rejected', false);
}

function extractResponse(input: unknown, latencyMs: number) {
  if (typeof input !== 'object' || input === null) return null;
  const row = input as Record<string, unknown>;
  const choices = row.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const choice = choices[0];
  if (typeof choice !== 'object' || choice === null) return null;
  const message = (choice as Record<string, unknown>).message;
  if (typeof message !== 'object' || message === null) return null;
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== 'string') return null;
  const requestId =
    row.id === undefined || row.id === null
      ? null
      : generationMetadataSchema.shape.requestId.unwrap().parse(row.id);
  const model =
    row.model === undefined || row.model === null
      ? null
      : generationMetadataSchema.shape.model.unwrap().parse(row.model);
  const usage =
    row.usage === undefined || row.usage === null
      ? null
      : rawUsageSchema.parse(row.usage);
  return {
    content,
    metadata: generationMetadataSchema.parse({
      requestId,
      model,
      usage,
      latencyMs,
    }),
  };
}

export function createOpenRouterProvider(
  options: OpenRouterProviderOptions,
): StructuredGenerationProvider {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const sleepImplementation = options.sleep ?? sleep;
  const diagnosticReporter = options.onDiagnostic ?? reportDiagnostic;

  return {
    async generate<T>(request: StructuredGenerationRequest<T>) {
      const startedAt = performance.now();
      let response: Response | undefined;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          response = await fetchImplementation(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${options.apiKey}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
              body: JSON.stringify({
                model: options.model,
                messages: [
                  { role: 'system', content: request.system },
                  { role: 'user', content: request.input },
                ],
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: request.name,
                    strict: true,
                    schema: request.jsonSchema,
                  },
                },
                provider: {
                  require_parameters: true,
                  data_collection: 'deny',
                  zdr: true,
                  allow_fallbacks: true,
                },
              }),
            },
          );
        } catch {
          throw new ProviderError('provider_unavailable', true);
        }

        if (response.ok) break;
        const error = responseError(response);
        const willRetry = error.retryable && attempt === 1;
        diagnosticReporter({
          event: 'analysis_provider_http_error',
          provider: 'openrouter',
          requestName: safeRequestName(request.name),
          httpStatus: response.status,
          errorCode: error.code,
          retryable: error.retryable,
          attempt,
          willRetry,
        });
        if (!willRetry) throw error;
        await sleepImplementation(error.retryAfterMs ?? defaultRetryDelayMs);
      }

      if (!response?.ok) throw new ProviderError('provider_unavailable', true);

      let result: ReturnType<typeof extractResponse>;
      try {
        const elapsedMs = Math.min(
          Math.max(Math.round(performance.now() - startedAt), 0),
          3_600_000,
        );
        result = extractResponse(await response.json(), elapsedMs);
        if (!result) throw new Error('invalid');
      } catch {
        throw new ProviderError('invalid_provider_response', true);
      }

      try {
        return {
          value: request.parse(JSON.parse(result.content)),
          metadata: result.metadata,
        };
      } catch {
        throw new ProviderError(
          'invalid_provider_response',
          true,
          undefined,
          result.metadata,
        );
      }
    },
  };
}
