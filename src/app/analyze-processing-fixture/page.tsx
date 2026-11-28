import { notFound } from 'next/navigation';

import { localeSchema } from '@/lib/i18n/locales';
import { appMessages } from '@/lib/i18n/messages/app';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export default async function AnalyzeProcessingFixturePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ locale?: string }> }>) {
  if (process.env.NODE_ENV !== 'production' && isUiPreviewEnabled()) {
    const { AnalyzeProcessingFixture } =
      await import('@/components/app-shell/analyze-processing-fixture');
    const parsedLocale = localeSchema.safeParse((await searchParams).locale);
    const locale = parsedLocale.success
      ? parsedLocale.data
      : await getRequestLocale();
    return <AnalyzeProcessingFixture copy={appMessages[locale].processing} />;
  }
  notFound();
}
