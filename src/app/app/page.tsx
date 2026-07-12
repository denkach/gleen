import type { Metadata } from 'next';

import { NewAnalysisHome } from '@/components/app-shell/new-analysis-home';

export const metadata: Metadata = {
  title: 'New analysis — Gleen',
};

export default function AppPage() {
  return <NewAnalysisHome />;
}
