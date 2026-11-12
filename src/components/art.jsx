// Hand-drawn illustrations in the app palette (no platform logos).
const Defs = () => (
  <defs>
    <linearGradient id="aG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff4d6d" /><stop offset=".55" stopColor="#7c5cff" /><stop offset="1" stopColor="#22e3d6" /></linearGradient>
    <linearGradient id="aR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7a93" /><stop offset="1" stopColor="#ff3d62" /></linearGradient>
    <linearGradient id="aC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5ff0e6" /><stop offset="1" stopColor="#14b8ad" /></linearGradient>
    <linearGradient id="aV" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a08bff" /><stop offset="1" stopColor="#6a4cf0" /></linearGradient>
    <linearGradient id="aScreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd36e" /><stop offset=".5" stopColor="#ff7a93" /><stop offset="1" stopColor="#7c5cff" /></linearGradient>
    <radialGradient id="aGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#7c5cff" stopOpacity=".45" /><stop offset="1" stopColor="#7c5cff" stopOpacity="0" /></radialGradient>
  </defs>
);

const Spark = ({ x, y, s = 1, c = '#ffd36e' }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-10C1-3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10z" fill={c} />
);

function Phone({ x, y, w = 110, h = 196, rot = 0, children }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-w / 2 + 4} y={-h / 2 + 10} width={w} height={h} rx="22" fill="#000" opacity=".25" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="22" fill="#1d2030" stroke="#33374d" strokeWidth="3" />
      <rect x={-w / 2 + 7} y={-h / 2 + 7} width={w - 14} height={h - 14} rx="16" fill="url(#aScreen)" />
      {children}
    </g>
  );
}

export function IllusCompose() {
  return (
    <svg viewBox="0 0 320 260" width="100%" style={{ maxWidth: 340 }}>
      <Defs />
      <circle cx="160" cy="130" r="120" fill="url(#aGlow)" />
      <Phone x={160} y={128}>
        <circle cx="0" cy="-30" r="20" fill="#fff" opacity=".9" />
        <path d="M-30 20q30-36 60 0" fill="#fff" opacity=".9" />
        <rect x="-38" y="44" width="76" height="9" rx="4.5" fill="#fff" opacity=".85" />
        <rect x="-38" y="60" width="50" height="9" rx="4.5" fill="#fff" opacity=".55" />
      </Phone>
      <g transform="translate(232 70) rotate(8)">
        <rect x="-38" y="-20" width="80" height="40" rx="14" fill="url(#aV)" />
        <text x="2" y="6" textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize="16" fill="#fff">#tips</text>
      </g>
      <g transform="translate(86 188) rotate(-8)">
        <rect x="-44" y="-20" width="92" height="40" rx="14" fill="#fff" />
        <text x="2" y="6" textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize="16" fill="#7c5cff">#howto</text>
      </g>
      <g transform="translate(78 64) rotate(-12)">
        <rect x="-26" y="-26" width="52" height="52" rx="16" fill="#fff" />
        <path d="M-10 10l3-11 17-17 8 8-17 17z" fill="#ff4d6d" />
        <path d="M-10 10l3-11 8 8z" fill="#1d2030" />
      </g>
      <Spark x={262} y={170} s={1.1} />
      <Spark x={52} y={128} s={0.7} c="#22e3d6" />
    </svg>
  );
}

export function IllusTwo() {
  return (
    <svg viewBox="0 0 320 260" width="100%" style={{ maxWidth: 340 }}>
      <Defs />
      <circle cx="160" cy="130" r="120" fill="url(#aGlow)" />
      <path d="M160 132 C 200 132 200 70 248 70" stroke="url(#aG)" strokeWidth="5" fill="none" strokeDasharray="2 12" strokeLinecap="round" />
      <path d="M160 132 C 200 132 200 194 248 194" stroke="url(#aG)" strokeWidth="5" fill="none" strokeDasharray="2 12" strokeLinecap="round" />
      <Phone x={100} y={132} w={96} h={172}>
        <path d="M-12-16v32l26-16z" fill="#fff" />
      </Phone>
      <g transform="translate(256 70)">
        <circle r="38" fill="url(#aR)" />
        <rect x="-19" y="-13" width="38" height="26" rx="8" fill="#fff" />
        <path d="M-5-6v12l10-6z" fill="#ff3d62" />
      </g>
      <g transform="translate(256 194)">
        <circle r="38" fill="url(#aC)" />
        <path d="M3-17v22a7.5 7.5 0 1 1-6.5-7.4" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <path d="M3-17c.8 5 4.7 9 9.8 9.8" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      </g>
      <Spark x={300} y={132} s={0.8} />
      <Spark x={40} y={40} s={0.7} c="#ff7a93" />
    </svg>
  );
}

export function IllusTrack() {
  return (
    <svg viewBox="0 0 320 260" width="100%" style={{ maxWidth: 340 }}>
      <Defs />
      <circle cx="160" cy="130" r="120" fill="url(#aGlow)" />
      <g transform="translate(160 132)">
        <rect x="-112" y="-84" width="224" height="168" rx="26" fill="#1d2030" stroke="#33374d" strokeWidth="3" />
        {[0, 1, 2].map(i => (
          <g key={i} transform={`translate(-92 ${-62 + i * 46})`}>
            <rect width="30" height="38" rx="9" fill={['url(#aR)', 'url(#aV)', 'url(#aC)'][i]} />
            <rect x="42" y="6" width={[96, 74, 86][i]} height="9" rx="4.5" fill="#fff" opacity=".85" />
            <rect x="42" y="22" width="40" height="9" rx="4.5" fill="#fff" opacity=".35" />
            <circle cx="166" cy="19" r="12" fill={i < 2 ? '#3ddc97' : '#33374d'} />
            {i < 2 && <path d="M160 19l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        ))}
      </g>
      <g transform="translate(262 52)">
        <circle r="26" fill="#ffb547" />
        <path d="M0-12v12l8 6" stroke="#1d2030" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      </g>
      <Spark x={52} y={210} s={1} c="#22e3d6" />
      <Spark x={60} y={50} s={0.6} />
    </svg>
  );
}

export function IllusEmpty({ size = 200 }) {
  return (
    <svg viewBox="0 0 220 170" width={size}>
      <Defs />
      <ellipse cx="110" cy="152" rx="70" ry="9" fill="#000" opacity=".18" />
      <g transform="translate(84 84) rotate(-10)">
        <rect x="-34" y="-58" width="68" height="116" rx="16" fill="url(#aR)" />
        <path d="M-8-12v24l20-12z" fill="#fff" />
      </g>
      <g transform="translate(138 88) rotate(9)">
        <rect x="-34" y="-58" width="68" height="116" rx="16" fill="url(#aC)" stroke="var(--bg)" strokeWidth="4" />
        <path d="M3-17v22a7.5 7.5 0 1 1-6.5-7.4" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M3-17c.8 5 4.7 9 9.8 9.8" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
      <Spark x={190} y={30} s={0.9} />
      <Spark x={30} y={50} s={0.7} c="#a08bff" />
    </svg>
  );
}
