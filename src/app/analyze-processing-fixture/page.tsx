import { notFound } from 'next/navigation';

import AnalyzeProcessingFixtureEntry from '@/components/app-shell/analyze-processing-fixture-entry';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export default function AnalyzeProcessingFixturePage() {
  if (!isUiPreviewEnabled()) {
    notFound();
  }

  return <AnalyzeProcessingFixtureEntry />;
}
