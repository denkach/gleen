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

export type SupabaseAdminEnv = Readonly<{
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}>;

export type StripePublicEnv = Readonly<{
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
}>;

export type StripeServerEnv = Readonly<{
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}>;

export type StripePortalEnv = Readonly<{
  STRIPE_PORTAL_CONFIGURATION_ID: string;
}>;

const invalidUrlMessage = 'NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL';

function readHttpsSupabaseUrl(input: NodeJS.ProcessEnv): string {
  const value = input.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTPS URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTPS URL');
  }
  return value;
}

export function validateSupabaseAdminEnv(
  input: NodeJS.ProcessEnv,
): SupabaseAdminEnv {
  const secret = input.SUPABASE_SECRET_KEY?.trim();
  if (!secret) throw new Error('SUPABASE_SECRET_KEY is required');
  return Object.freeze({
    NEXT_PUBLIC_SUPABASE_URL: readHttpsSupabaseUrl(input),
    SUPABASE_SECRET_KEY: secret,
  });
}

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

export function validateStripePublicEnv(
  input: Readonly<Partial<NodeJS.ProcessEnv>>,
): StripePublicEnv {
  const publishableKey = input.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!publishableKey) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required');
  }

  return Object.freeze({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: publishableKey,
  });
}

export function validateStripeServerEnv(
  input: Readonly<Partial<NodeJS.ProcessEnv>>,
): StripeServerEnv {
  const secretKey = input.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }

  const webhookSecret = input.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required');
  }

  return Object.freeze({
    STRIPE_SECRET_KEY: secretKey,
    STRIPE_WEBHOOK_SECRET: webhookSecret,
  });
}

export function validateStripePortalEnv(
  input: Readonly<Partial<NodeJS.ProcessEnv>>,
): StripePortalEnv {
  const configurationId = input.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  if (!configurationId) {
    throw new Error('STRIPE_PORTAL_CONFIGURATION_ID is required');
  }
  if (!configurationId.startsWith('bpc_')) {
    throw new Error('STRIPE_PORTAL_CONFIGURATION_ID must start with bpc_');
  }
  return Object.freeze({
    STRIPE_PORTAL_CONFIGURATION_ID: configurationId,
  });
}

export function validatePublicEnv(input: NodeJS.ProcessEnv): PublicEnv {
  const value = input.NEXT_PUBLIC_APP_URL?.trim();
  const supabaseUrlValue = readHttpsSupabaseUrl(input);
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

  if (!supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
  }

  return Object.freeze({
    NEXT_PUBLIC_APP_URL: value,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrlValue,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  });
}
