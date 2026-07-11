type PublicEnv = Readonly<{
  NEXT_PUBLIC_APP_URL: string;
}>;

const invalidUrlMessage = 'NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL';

export function validatePublicEnv(input: NodeJS.ProcessEnv): PublicEnv {
  const value = input.NEXT_PUBLIC_APP_URL?.trim();

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

  return Object.freeze({ NEXT_PUBLIC_APP_URL: value });
}
