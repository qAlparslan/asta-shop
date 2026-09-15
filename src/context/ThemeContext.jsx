import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  THEME_PRESETS,
  THEME_STORAGE_KEY,
  isDarkThemeId,
  normalizeThemeId,
} from '../lib/themePresets.js';

const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return normalizeThemeId(stored);
  } catch {
    /* ignore */
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(readStoredTheme);

  useEffect(() => {
    const normalized = normalizeThemeId(themeId);
    document.documentElement.setAttribute('data-theme', normalized);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      /* ignore */
    }
  }, [themeId]);

  const setThemeId = (next) => {
    setThemeIdState(normalizeThemeId(next));
  };

  const toggleTheme = () => {
    setThemeIdState((prev) => (normalizeThemeId(prev) === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({
      themeId: normalizeThemeId(themeId),
      setThemeId,
      toggleTheme,
      themes: THEME_PRESETS,
      isDark: isDarkThemeId(normalizeThemeId(themeId)),
    }),
    [themeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme ThemeProvider içinde kullanılmalıdır.');
  return ctx;
}
