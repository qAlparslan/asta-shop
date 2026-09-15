import { useEffect, useId, useRef, useState } from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const focusRing =
  'outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-asta-maroon/35';

/**
 * @param {{ compact?: boolean; className?: string }} props
 */
export default function ThemeSwitcher({ compact = false, className = '' }) {
  const { themeId, setThemeId, themes, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = themes.find((t) => t.id === themeId) ?? themes[0];

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        className={`${focusRing} inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-asta-icon transition-colors hover:border-neutral-300 hover:text-asta-maroon theme-switcher-trigger`}
        title="Görünüm modu"
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
        <span className="sr-only">Görünüm: {active.label}</span>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Görünüm modu seçin"
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,15rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg theme-switcher-panel"
        >
          {themes.map((t) => {
            const selected = t.id === themeId;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setThemeId(t.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${
                  selected ? 'bg-neutral-50 font-semibold text-asta-navy' : 'text-neutral-700'
                }`}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-neutral-300 shadow-inner"
                  style={{ backgroundColor: t.swatch }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">{t.label}</span>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0 text-asta-maroon" strokeWidth={2.5} aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
