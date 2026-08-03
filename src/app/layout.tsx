import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';

import { validatePublicEnv } from '@/env';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { toBcp47 } from '@/lib/i18n/locales';
import { marketingMessages } from '@/lib/i18n/messages/marketing';
import { getRequestLocale } from '@/lib/i18n/request-locale';

import './globals.css';
import '../styles/landing-reference.css';
import '../styles/auth-reference.css';
import '../styles/onboarding-reference.css';
import '../styles/app-shell-reference.css';
import '../styles/history-reference.css';
import '../styles/result-workspace-reference.css';

const { NEXT_PUBLIC_APP_URL } = validatePublicEnv(process.env);

function reportMissingMarketingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    marketingMessages,
    locale,
    'marketing',
    reportMissingMarketingTranslation,
  );

  return {
    metadataBase: new URL(NEXT_PUBLIC_APP_URL),
    title: copy.metadata.title,
    description: copy.metadata.description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      title: copy.metadata.title,
      description: copy.metadata.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.metadata.title,
      description: copy.metadata.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={toBcp47(locale)}>
      <body>{children}</body>
    </html>
  );
}
