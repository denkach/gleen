import { describe, expect, it, vi } from 'vitest';

import { createOpenRouterProvider } from './openrouter-provider';
import { ProviderError } from './provider';

const request = {
  name: 'gleen_summary_v1',
  system: 'Return a summary.',
  input: 'Transcript',
  jsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
  parse(value: unknown) {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('title' in value) ||
      typeof value.title !== 'string'
    )
      throw new Error('invalid');
    return { title: value.title };
  },
};

function response(status: number, body: unknown, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('OpenRouter structured provider', () => {
  it('sends strict schema and mandatory privacy routing without leaking the key', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response(200, {
        id: 'generation-id',
        model: 'vendor/model',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
          cost: 0.00042,
          prompt_tokens_details: {
            cached_tokens: 3,
            cache_write_tokens: 2,
            audio_tokens: 1,
          },
          completion_tokens_details: { reasoning_tokens: 2 },
          cost_details: { upstream_inference_cost: 0.00021 },
        },
        choices: [{ message: { content: '{"title":"Result"}' } }],
      }),
    );
    const provider = createOpenRouterProvider({
      apiKey: 'secret',
      model: 'vendor/model',
      fetch,
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      value: { title: 'Result' },
      metadata: {
        requestId: 'generation-id',
        model: 'vendor/model',
        usage: {
          promptTokens: 10,
          completionTokens: 4,
          totalTokens: 14,
          cost: 0.00042,
          cachedPromptTokens: 3,
          cacheWritePromptTokens: 2,
          promptAudioTokens: 1,
          reasoningTokens: 2,
          upstreamInferenceCost: 0.00021,
        },
        latencyMs: expect.any(Number),
      },
    });
    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: 'vendor/model',
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'gleen_summary_v1', strict: true },
      },
      provider: {
        require_parameters: true,
        data_collection: 'deny',
        zdr: true,
        allow_fallbacks: true,
      },
    });
    expect(String(init.body)).not.toContain('secret');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret' });
  });

  it('accepts documented OpenRouter usage fields while retaining only safe metrics', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response(200, {
        id: 'generation-id',
        model: 'openai/gpt-4.1-mini',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
          cost: 0.0012,
          is_byok: false,
          prompt_tokens_details: { cached_tokens: 2 },
          completion_tokens_details: { reasoning_tokens: 5 },
          cost_details: {
            upstream_inference_cost: null,
            upstream_inference_prompt_cost: 0.0008,
            upstream_inference_completions_cost: 0.0004,
          },
          server_tool_use_details: {
            tool_calls_requested: 2,
            tool_calls_executed: 2,
          },
        },
        choices: [{ message: { content: '{"title":"Result"}' } }],
      }),
    );
    const provider = createOpenRouterProvider({
      apiKey: 'secret',
      model: 'openai/gpt-4.1-mini',
      fetch,
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      value: { title: 'Result' },
      metadata: {
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
          cost: 0.0012,
          cachedPromptTokens: 2,
          reasoningTokens: 5,
        },
      },
    });
  });

  it('drops unknown provider usage fields instead of persisting or rejecting them', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response(200, {
        id: 'generation-id',
        model: 'vendor/model',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
          transcript: 'sensitive generated prose',
          is_byok: 'provider-format-changed',
          prompt_tokens_details: {
            cached_tokens: 3,
            provider_note: 'not a metric we retain',
          },
          cost_details: {
            upstream_inference_prompt_cost: { currency: 'USD', value: 1 },
          },
          server_tool_use_details: 'provider-format-changed',
        },
        choices: [{ message: { content: '{"title":"Result"}' } }],
      }),
    );
    const provider = createOpenRouterProvider({
      apiKey: 'secret',
      model: 'vendor/model',
      fetch,
    });

    const result = await provider.generate(request);

    expect(result.metadata.usage).toEqual({
      promptTokens: 10,
      completionTokens: 4,
      totalTokens: 14,
      cachedPromptTokens: 3,
    });
    expect(result.metadata.usage).not.toHaveProperty('transcript');
    expect(result.metadata.usage).not.toHaveProperty('providerNote');
  });

  it.each([
    [
      'an out-of-range usage metric',
      {
        id: 'generation-id',
        model: 'vendor/model',
        usage: {
          prompt_tokens: 1_000_000_001,
          completion_tokens: 4,
          total_tokens: 1_000_000_005,
        },
      },
    ],
    [
      'an unconstrained request identifier',
      {
        id: 'generated prose must not become an identifier',
        model: 'vendor/model',
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      },
    ],
  ] as const)('rejects %s', async (_name, metadata) => {
    const fetch = vi.fn().mockResolvedValue(
      response(200, {
        ...metadata,
        choices: [{ message: { content: '{"title":"Result"}' } }],
      }),
    );
    const provider = createOpenRouterProvider({
      apiKey: 'secret',
      model: 'vendor/model',
      fetch,
    });

    await expect(provider.generate(request)).rejects.toMatchObject({
      code: 'invalid_provider_response',
      retryable: true,
    });
  });

  it.each([408, 429, 502, 503])(
    'classifies HTTP %i as retryable',
    async (status) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(response(status, { error: { message: 'raw' } }));
      const provider = createOpenRouterProvider({
        apiKey: 'secret',
        model: 'vendor/model',
        fetch,
      });

      await expect(provider.generate(request)).rejects.toMatchObject({
        code: 'provider_unavailable',
        retryable: true,
      });
    },
  );

  it('honors a numeric Retry-After header without exposing raw errors', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        response(
          429,
          { error: { message: 'sensitive' } },
          { 'Retry-After': '3' },
        ),
      );
    const provider = createOpenRouterProvider({
      apiKey: 'secret',
      model: 'vendor/model',
      fetch,
    });

    const error = await provider.generate(request).catch((value) => value);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ retryAfterMs: 3000 });
    expect(error.message).not.toContain('sensitive');
  });
});
