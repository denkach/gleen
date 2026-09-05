import Link from 'next/link';

import type { Capability } from '@/lib/settings/capabilities';

type CapabilitySettingsProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  items: readonly Capability[];
}>;

export function CapabilitySettings({
  eyebrow,
  title,
  description,
  items,
}: CapabilitySettingsProps) {
  return (
    <section
      className="capability-settings"
      aria-labelledby="capability-settings-title"
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 id="capability-settings-title">{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-capability-list">
        {items.map((item) => (
          <article
            className="settings-capability"
            data-action={item.action.kind}
            key={item.key}
          >
            <div>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
            </div>
            {item.action.kind === 'link' && item.action.label ? (
              <Link
                className="ui-button"
                data-variant="ghost"
                href={item.action.href}
              >
                {item.action.label}
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
