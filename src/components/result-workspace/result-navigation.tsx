import type { ResultCopy } from '@/lib/result-workspace/copy';
import type { ResultArtifact } from '@/lib/result-workspace/navigation';
import { TabsList, TabsTrigger, type TabsAccent } from '@/components/ui/tabs';

export type ResultNavigationItem = Readonly<{
  value: ResultArtifact;
  label: string;
  unavailable?: boolean;
}>;

export function ResultNavigation({
  accent,
  copy,
  items,
}: Readonly<{
  accent: TabsAccent;
  copy: ResultCopy;
  items: readonly ResultNavigationItem[];
}>) {
  return (
    <nav className="result-navigation" aria-label={copy.tabsLabel}>
      <TabsList accent={accent} aria-label={copy.tabsLabel}>
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            data-artifact-unavailable={item.unavailable || undefined}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </nav>
  );
}
