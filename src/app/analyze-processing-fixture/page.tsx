import { notFound } from 'next/navigation';

import AnalyzeProcessingFixtureEntry from '@/components/app-shell/analyze-processing-fixture-entry';
import { localeSchema } from '@/lib/i18n/locales';
import { appMessages } from '@/lib/i18n/messages/app';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export default async function AnalyzeProcessingFixturePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ locale?: string }> }>) {
  if (!isUiPreviewEnabled()) {
    notFound();
  }

  const parsedLocale = localeSchema.safeParse((await searchParams).locale);
  const locale = parsedLocale.success ? parsedLocale.data : 'en';
  return (
    <AnalyzeProcessingFixtureEntry copy={appMessages[locale].processing} />
  );
}
