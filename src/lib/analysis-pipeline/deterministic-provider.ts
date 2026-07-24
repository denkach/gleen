import {
  ProviderError,
  type SafeAnalysisErrorCode,
  type StructuredGenerationProvider,
  type StructuredGenerationRequest,
} from './provider';

export type DeterministicProvider = StructuredGenerationProvider &
  Readonly<{
    requests: readonly StructuredGenerationRequest<unknown>[];
  }>;

type Failure = Readonly<{
  count: number;
  code?: SafeAnalysisErrorCode;
  retryable?: boolean;
}>;

export function createDeterministicProvider(
  fixtures: Readonly<Record<string, unknown>>,
  failures: Readonly<Record<string, Failure>> = {},
): DeterministicProvider {
  const requests: StructuredGenerationRequest<unknown>[] = [];
  const remaining = new Map(
    Object.entries(failures).map(([name, failure]) => [name, failure.count]),
  );

  return {
    requests,
    async generate<T>(request: StructuredGenerationRequest<T>) {
      requests.push(request as StructuredGenerationRequest<unknown>);
      const failure = failures[request.name];
      const attemptsLeft = remaining.get(request.name) ?? 0;
      if (failure && attemptsLeft > 0) {
        remaining.set(request.name, attemptsLeft - 1);
        throw new ProviderError(
          failure.code ?? 'provider_unavailable',
          failure.retryable ?? true,
        );
      }
      if (!(request.name in fixtures)) {
        throw new ProviderError('invalid_provider_response', false);
      }
      return {
        value: request.parse(fixtures[request.name]),
        metadata: {
          requestId: `deterministic:${request.name}`,
          model: 'deterministic',
          usage: null,
        },
      };
    },
  };
}
