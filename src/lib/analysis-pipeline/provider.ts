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

export type GenerationResult<T> = Readonly<{
  value: T;
  metadata: Readonly<{
    requestId: string | null;
    model: string | null;
    usage: unknown;
  }>;
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
  ) {
    super(code);
    this.name = 'ProviderError';
  }
}
