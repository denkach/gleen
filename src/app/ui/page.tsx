import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { materializeUiPreviewCopy } from '@/lib/i18n/ui-preview-copy';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

import { UiPreview } from './ui-preview';

function reportMissingSharedTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    sharedMessages,
    locale,
    'shared',
    reportMissingSharedTranslation,
  );
  return {
    title: copy.uiPreview.metadataTitle,
    robots: { index: false, follow: false },
  };
}

export default async function UiPreviewPage() {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  const locale = await getRequestLocale();
  const copy = selectMessages(
    sharedMessages,
    locale,
    'shared',
    reportMissingSharedTranslation,
  );
  return <UiPreview copy={materializeUiPreviewCopy(copy.uiPreview)} />;
}
