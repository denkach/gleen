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
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
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
      metadata: { requestId: 'generation-id', model: 'vendor/model' },
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
