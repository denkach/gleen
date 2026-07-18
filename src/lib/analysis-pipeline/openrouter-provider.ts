import {
  ProviderError,
  type StructuredGenerationProvider,
  type StructuredGenerationRequest,
} from './provider';

type OpenRouterProviderOptions = Readonly<{
  apiKey: string;
  model: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}>;

const retryableStatuses = new Set([408, 429, 502, 503]);

function retryAfterMs(response: Response): number | undefined {
  const seconds = Number(response.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
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

function extractResponse(input: unknown) {
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
  return {
    content,
    requestId: typeof row.id === 'string' ? row.id : null,
    model: typeof row.model === 'string' ? row.model : null,
    usage: row.usage ?? null,
  };
}

export function createOpenRouterProvider(
  options: OpenRouterProviderOptions,
): StructuredGenerationProvider {
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  return {
    async generate<T>(request: StructuredGenerationRequest<T>) {
      let response: Response;
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

      if (!response.ok) throw responseError(response);

      try {
        const result = extractResponse(await response.json());
        if (!result) throw new Error('invalid');
        return {
          value: request.parse(JSON.parse(result.content)),
          metadata: {
            requestId: result.requestId,
            model: result.model,
            usage: result.usage,
          },
        };
      } catch {
        throw new ProviderError('invalid_provider_response', true);
      }
    },
  };
}
