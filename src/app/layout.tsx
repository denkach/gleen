import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';

import { validatePublicEnv } from '@/env';

import './globals.css';

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

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
