export const THEME_STORAGE_KEY = 'asta-theme';

/** @typedef {{ id: string; label: string; shortLabel: string; swatch: string }} ThemePreset */

/** @type {ThemePreset[]} */
export const THEME_PRESETS = [
  { id: 'light', label: 'Açık mod', shortLabel: 'Açık', swatch: '#ffffff' },
  { id: 'dark-graphite', label: 'Koyu — grafik gri', shortLabel: 'Gri', swatch: '#1c1c1f' },
  { id: 'dark-slate', label: 'Koyu — arduvaz', shortLabel: 'Arduvaz', swatch: '#1a2430' },
  { id: 'dark-midnight', label: 'Koyu — gece lacivert', shortLabel: 'Lacivert', swatch: '#141a28' },
];

export function isValidThemeId(id) {
  return THEME_PRESETS.some((t) => t.id === id);
}

export function isDarkThemeId(id) {
  return typeof id === 'string' && id.startsWith('dark-');
}
