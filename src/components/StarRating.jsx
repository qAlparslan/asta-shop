import { Star } from 'lucide-react';

/**
 * @param {{ value?: number; size?: 'sm' | 'md'; className?: string; interactive?: boolean; onChange?: (n: number) => void }} props
 */
export default function StarRating({
  value = 0,
  size = 'sm',
  className = '',
  interactive = false,
  onChange,
}) {
  const clamped = Math.min(5, Math.max(0, Number(value) || 0));
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={interactive ? 'group' : 'img'}
      aria-label={interactive ? 'Puan seçin' : `${clamped.toFixed(1)} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.min(1, Math.max(0, clamped - (i - 1)));
        const filled = fill >= 0.95;
        const partial = fill > 0.05 && fill < 0.95;

        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange?.(i)}
              className="rounded p-0.5 text-amber-400 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label={`${i} yıldız`}
            >
              <Star
                className={`${sizeClass} ${i <= Math.round(clamped) ? 'fill-current' : ''}`}
                strokeWidth={1.5}
              />
            </button>
          );
        }

        return (
          <span key={i} className={`relative inline-block ${sizeClass}`}>
            <Star className={`${sizeClass} text-neutral-200`} strokeWidth={1.5} aria-hidden />
            {(filled || partial) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: partial ? `${fill * 100}%` : '100%' }}
              >
                <Star
                  className={`${sizeClass} fill-amber-400 text-amber-400`}
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
