import Link from 'next/link';

import type { SettingsCopy } from '@/lib/i18n/messages/settings';
import {
  settingsDestinations,
  type SettingsOverviewModel,
} from '@/lib/settings/account-atlas';

import { SettingsIcon } from './settings-icons';

export function SettingsOverview({
  copy,
  summaries,
}: Readonly<{ copy: SettingsCopy; summaries: SettingsOverviewModel }>) {
  return (
    <section className="settings-atlas" aria-labelledby="settings-title">
      <header className="page-head settings-atlas__head">
        <div>
          <span className="eyebrow">{copy.page.eyebrow}</span>
          <h1 id="settings-title">{copy.page.title}</h1>
          <p>{copy.atlas.overviewDescription}</p>
        </div>
      </header>
      <div className="settings-atlas__grid">
        {settingsDestinations.map((destination) => {
          const destinationCopy = copy.atlas.destinations[destination.key];
          const summary = summaries[destination.key];
          return (
            <Link
              className="settings-destination-card"
              data-state={summary.state}
              data-testid="settings-destination-card"
              href={destination.href}
              key={destination.key}
            >
              <span className="settings-destination-card__icon">
                <SettingsIcon name={destination.icon} />
              </span>
              <span className="settings-destination-card__copy">
                <strong>{destinationCopy.title}</strong>
                <span>{destinationCopy.description}</span>
                <small>{summary.text}</small>
              </span>
              <span className="settings-destination-card__arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
