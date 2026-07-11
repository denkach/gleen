const artifacts = [
  ['summary', 'Summary'],
  ['flash', 'Flashcards'],
  ['time', '00:14:32'],
  ['export', 'Export ready'],
] as const;

export function PrismScene() {
  return (
    <div className="prism-stage" aria-hidden="true">
      <div className="prism-haze" />
      <div className="prism-wrap">
        <span className="beam-in" />
        <svg className="prism-svg" viewBox="0 0 320 300">
          <defs>
            <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fff" stopOpacity=".18" />
              <stop offset="1" stopColor="#fff" stopOpacity=".02" />
            </linearGradient>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fff" stopOpacity=".72" />
              <stop offset="1" stopColor="#c77dff" stopOpacity=".2" />
            </linearGradient>
          </defs>
          <path
            d="M160 35 282 252H38Z"
            fill="url(#glass)"
            stroke="url(#edge)"
            strokeWidth="2"
          />
          <path
            d="M160 35 198 252M160 35 122 252"
            fill="none"
            stroke="rgba(255,255,255,.13)"
          />
        </svg>
        <div className="spectrum">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="ray" key={index} />
          ))}
        </div>
        {artifacts.map(([kind, label]) => (
          <div className={`artifact-float ${kind}`} key={kind}>
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
