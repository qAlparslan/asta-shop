import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const focusRing =
  'outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-asta-maroon/35';

/**
 * @param {{ compact?: boolean; className?: string }} props
 */
export default function ThemeSwitcher({ compact = false, className = '' }) {
  const { isDark, toggleTheme, themes } = useTheme();
  const active = isDark ? themes[1] : themes[0];

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${focusRing} inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-asta-icon transition-colors hover:border-neutral-300 hover:text-asta-maroon theme-switcher-trigger ${className}`}
      title={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
      aria-label={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Moon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
      ) : (
        <Sun className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
      )}
      {!compact ? (
        <span className="hidden text-xs font-semibold text-neutral-700 sm:inline theme-switcher-label">
          {active.shortLabel}
        </span>
      ) : null}
    </button>
  );
}
