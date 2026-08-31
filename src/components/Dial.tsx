/** Indeks-uret — en ring, der fyldes efter modningsindekset. */
export function Dial({ score, color, size = 96 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div className="dial" style={{ flexBasis: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bark)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="dial-num">
        <b style={{ color }}>{score}</b>
        <span>INDEKS</span>
      </div>
    </div>
  );
}

/** Farve pr. modningsbånd — guld kun når vinduet er åbent. */
export const BAND_COLOR = {
  open: 'var(--gold)',
  ok: 'var(--lichen)',
  soon: 'var(--rain)',
  dry: 'var(--mute)',
  // Samme farve som 'dry' — begge betyder "intet lige nu", men teksten
  // (band().label) skelner: tør skovbund kan ændre sig med regn, forkert
  // sæson kan ikke.
  offseason: 'var(--mute)',
} as const;
