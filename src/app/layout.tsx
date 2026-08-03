import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';

import { validatePublicEnv } from '@/env';
import { toBcp47 } from '@/lib/i18n/locales';
import { getRequestLocale } from '@/lib/i18n/request-locale';

import './globals.css';
import '../styles/landing-reference.css';
import '../styles/auth-reference.css';
import '../styles/onboarding-reference.css';
import '../styles/app-shell-reference.css';
import '../styles/history-reference.css';
import '../styles/result-workspace-reference.css';

const { NEXT_PUBLIC_APP_URL } = validatePublicEnv(process.env);
const landingDescription =
  'Turn any YouTube video into a structured summary, smart flashcards, precise timestamps, and export-ready knowledge.';

export const metadata: Metadata = {
  metadataBase: new URL(NEXT_PUBLIC_APP_URL),
  title: 'Gleen — Watch less. Understand more.',
  description: landingDescription,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Gleen — Watch less. Understand more.',
    description: landingDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gleen — Watch less. Understand more.',
    description: landingDescription,
  },
  robots: { index: true, follow: true },
};

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
