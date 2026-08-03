import Link from 'next/link';

import type { AppMessages } from '@/lib/i18n/messages/app';

interface DestinationStateProps {
  copy: AppMessages['destination'];
  eyebrow: string;
  title: string;
  description: string;
}

export function DestinationState({
  copy,
  eyebrow,
  title,
  description,
}: DestinationStateProps) {
  return (
    <section className="destination-state" aria-labelledby="destination-title">
      <div className="page-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 id="destination-title">{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="panel destination-panel">
        <p>{copy.ready}</p>
        <Link className="ui-button" href="/app">
          {copy.newAnalysis}
        </Link>
      </div>
    </section>
  );
}
