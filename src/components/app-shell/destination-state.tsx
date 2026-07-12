import Link from 'next/link';

interface DestinationStateProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function DestinationState({
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
        <p>This workspace is ready for the next product stage.</p>
        <Link className="ui-button" href="/app">
          New analysis
        </Link>
      </div>
    </section>
  );
}
