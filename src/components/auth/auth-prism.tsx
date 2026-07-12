export function AuthPrism() {
  return (
    <div className="auth-prism prism-wrap" aria-hidden="true">
      <span className="beam-in" />
      <svg className="prism-svg" viewBox="0 0 320 300">
        <defs>
          <linearGradient id="auth-prism-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".52" />
            <stop offset=".5" stopColor="#c77dff" stopOpacity=".08" />
            <stop offset="1" stopColor="#5be9e9" stopOpacity=".15" />
          </linearGradient>
        </defs>
        <path
          d="M160 20 294 266 27 266Z"
          fill="url(#auth-prism-gradient)"
          stroke="#fff"
          strokeOpacity=".3"
        />
        <path
          d="M160 20 160 266M27 266 222 142 294 266"
          fill="none"
          stroke="#fff"
          strokeOpacity=".12"
        />
      </svg>
      <div className="spectrum">
        <span className="ray" />
        <span className="ray" />
        <span className="ray" />
        <span className="ray" />
      </div>
    </div>
  );
}
