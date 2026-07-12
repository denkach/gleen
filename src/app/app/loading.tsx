import { Skeleton } from '@/components/ui/skeleton';

export default function AppLoading() {
  return (
    <section className="app-loading" role="status" aria-live="polite">
      <span className="app-visually-hidden">Loading workspace</span>

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
