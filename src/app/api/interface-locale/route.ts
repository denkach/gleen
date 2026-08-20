import { NextResponse } from 'next/server';

import { persistInterfaceLocale } from '@/lib/i18n/actions';
import { localeSchema } from '@/lib/i18n/locales';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = localeSchema.safeParse(
    body && typeof body === 'object' && 'locale' in body
      ? body.locale
      : undefined,
  );
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'error', code: 'invalid_locale' },
      { status: 400 },
    );
  }

  const result = await persistInterfaceLocale(parsed.data);
  return NextResponse.json(
    result.ok
      ? { status: 'success', locale: result.locale }
      : { status: 'error', code: result.code },
    { status: result.ok ? 200 : 503 },
  );
}
