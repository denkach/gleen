import Link from 'next/link';

import type { SettingsDestination } from '@/lib/settings/account-atlas';
import type { Capability } from '@/lib/settings/capabilities';

import { SettingsPanel } from './settings-panel';

type CapabilitySettingsProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  icon: SettingsDestination['icon'];
  items: readonly Capability[];
}>;

export function CapabilitySettings({
  eyebrow,
  title,
  description,
  icon,
  items,
}: CapabilitySettingsProps) {
  return (
    <section
      className="capability-settings settings-page"
      aria-labelledby="capability-settings-title"
    >
      <div className="page-head settings-page-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 id="capability-settings-title">{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-panel-stack">
        <SettingsPanel description={description} icon={icon} title={title}>
          <div className="settings-capability-list">
            {items.map((item) => (
              <article
                className="settings-capability"
                data-action={item.action.kind}
                key={item.key}
              >
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                {item.action.kind === 'link' && item.action.label ? (
                  <Link
                    className="ui-button settings-utility-button"
                    data-variant="ghost"
                    href={item.action.href}
                  >
                    {item.action.label}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </SettingsPanel>
      </div>
    </section>
  );
}
