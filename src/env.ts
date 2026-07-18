type PublicEnv = Readonly<{
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
}>;

export type ProviderEnv = Readonly<{
  YOUTUBE_DATA_API_KEY: string;
  SUPADATA_API_KEY: string;
}>;

export type AnalysisProviderEnv = Readonly<{
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
}>;

const invalidUrlMessage = 'NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL';

export function validateAnalysisProviderEnv(
  input: NodeJS.ProcessEnv,
): AnalysisProviderEnv {
  const apiKey = input.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');
  const model = input.OPENROUTER_MODEL?.trim();
  if (!model) throw new Error('OPENROUTER_MODEL is required');
  return Object.freeze({
    OPENROUTER_API_KEY: apiKey,
    OPENROUTER_MODEL: model,
  });
}

export function validateProviderEnv(input: NodeJS.ProcessEnv): ProviderEnv {
  const youtube = input.YOUTUBE_DATA_API_KEY?.trim();
  if (!youtube) {
    throw new Error('YOUTUBE_DATA_API_KEY is required');
  }

  const supadata = input.SUPADATA_API_KEY?.trim();
  if (!supadata) {
    throw new Error('SUPADATA_API_KEY is required');
  }

  return Object.freeze({
    YOUTUBE_DATA_API_KEY: youtube,
    SUPADATA_API_KEY: supadata,
  });
}

export function validatePublicEnv(input: NodeJS.ProcessEnv): PublicEnv {
  const value = input.NEXT_PUBLIC_APP_URL?.trim();
  const supabaseUrlValue = input.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey =
    input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!value) {
    throw new Error('NEXT_PUBLIC_APP_URL is required');
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(invalidUrlMessage);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(invalidUrlMessage);
  }

  if (!supabaseUrlValue) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  let supabaseUrl: URL;

  try {
    supabaseUrl = new URL(supabaseUrlValue);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTPS URL');
  }

  if (supabaseUrl.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTPS URL');
  }

  if (!supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
  }

  return Object.freeze({
    NEXT_PUBLIC_APP_URL: value,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrlValue,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  });
}
