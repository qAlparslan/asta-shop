/** 6 köşeli yıldız rozet — dış/iç yarıçap ile yıldız patlaması */
function starburstPath(cx, cy, outerR, innerR, points = 6) {
  const coords = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return coords.join(' ');
}

/**
 * @param {{ percent: number; size?: 'sm' | 'md'; className?: string }} props
 */
export default function DiscountRosetteBadge({ percent, size = 'sm', className = '' }) {
  const pct = Math.round(Number(percent));
  if (!Number.isFinite(pct) || pct <= 0) return null;

  const dim = size === 'md' ? 'h-11 w-11' : 'h-9 w-9';
  const textSize = size === 'md' ? 'text-[10px]' : 'text-[9px]';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${className}`}
      aria-label={`%${pct} indirim`}
      title={`%${pct} indirim`}
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon
          points={starburstPath(20, 20, 19, 14.5, 6)}
          className="fill-brand"
        />
        <circle cx="20" cy="20" r="11.5" className="fill-white/95" />
        <polygon
          points={starburstPath(20, 20, 11, 9.2, 6)}
          className="fill-brand/15"
        />
      </svg>
      <span
        className={`relative z-[1] flex flex-col items-center justify-center font-black leading-none text-brand ${textSize}`}
      >
        <span className="text-[0.65em] font-bold leading-none">%</span>
        <span className="-mt-0.5 leading-none">{pct}</span>
      </span>
    </span>
  );
}
