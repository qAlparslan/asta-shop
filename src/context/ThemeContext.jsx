import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  THEME_PRESETS,
  THEME_STORAGE_KEY,
  isDarkThemeId,
  isValidThemeId,
} from '../lib/themePresets.js';

const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidThemeId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      /* ignore */
    }
  }, [themeId]);

  const setThemeId = (next) => {
    if (isValidThemeId(next)) setThemeIdState(next);
  };

  const value = useMemo(
    () => ({
      themeId,
      setThemeId,
      themes: THEME_PRESETS,
      isDark: isDarkThemeId(themeId),
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
