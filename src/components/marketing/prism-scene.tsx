const artifacts = [
  ['summary', 'Summary'],
  ['flash', 'Flashcards'],
  ['time', '00:14:32'],
  ['export', 'Export ready'],
] as const;

export function PrismScene({
  demoState,
}: Readonly<{ demoState: BeamDemoState }>) {
  return (
    <div
      className={`prism-stage is-awake${demoState === 'refracting' ? ' is-transforming' : ''}`}
      aria-hidden="true"
      data-demo-state={demoState}
    >
      <div className="prism-haze" />
      <div className="prism-wrap">
        <span className="beam-in" />
        <svg className="prism-svg" viewBox="0 0 320 300">
          <defs>
            <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
              <stop offset=".34" stopColor="#cfc8ff" stopOpacity=".10" />
              <stop offset=".7" stopColor="#5be9e9" stopOpacity=".12" />
              <stop offset="1" stopColor="#ffffff" stopOpacity=".03" />
            </linearGradient>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".8" />
              <stop offset=".5" stopColor="#c77dff" stopOpacity=".26" />
              <stop offset="1" stopColor="#5be9e9" stopOpacity=".5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M160 20 294 266 27 266Z"
            fill="url(#glass)"
            stroke="url(#edge)"
            strokeWidth="1.7"
          />
          <path
            d="M160 20 160 266M27 266 222 142 294 266M160 20 222 142"
            fill="none"
            stroke="#fff"
            strokeOpacity=".18"
          />
          <path
            d="M58 210 222 142"
            fill="none"
            stroke="#fff"
            strokeOpacity=".6"
            filter="url(#glow)"
          />
          <circle cx="222" cy="142" r="4" fill="#fff" filter="url(#glow)" />
        </svg>
        <div className="spectrum">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="ray" key={index} />
          ))}
        </div>
        {artifacts.map(([kind, label]) => (
          <div className={`artifact-float ${kind} is-emitted`} key={kind}>
            <div className="label">
              <span className="dot" />
              {label}
            </div>
            <div className="mini-line" />
            <div className="mini-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
import type { BeamDemoState } from './beam-input';
