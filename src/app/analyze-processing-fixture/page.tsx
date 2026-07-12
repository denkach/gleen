import { notFound } from 'next/navigation';

import { AnalyzeProcessingFixture } from '@/components/app-shell/analyze-processing-fixture';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export default function AnalyzeProcessingFixturePage() {
  if (!isUiPreviewEnabled()) {
    notFound();
  }

  return <AnalyzeProcessingFixture />;
}
