import { Skeleton } from '@/components/ui/skeleton';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { appMessages } from '@/lib/i18n/messages/app';
import { getRequestLocale } from '@/lib/i18n/request-locale';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export default async function AppLoading() {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    appMessages,
    locale,
    'app',
    reportMissingTranslation,
  );
  return (
    <section className="app-loading" role="status" aria-live="polite">
      <span className="app-visually-hidden">{copy.loading.workspace}</span>

      <div className="app-loading-head">
        <Skeleton shape="text" lines={2} />
      </div>
      <Skeleton className="app-loading-hero" />
      <div className="app-loading-panels">
        <Skeleton className="app-loading-panel" />
        <Skeleton className="app-loading-panel" />
      </div>
      <Skeleton className="app-loading-detail" shape="text" lines={2} />
    </section>
  );
}
