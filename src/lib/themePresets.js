export const THEME_STORAGE_KEY = 'asta-theme';

/** @typedef {{ id: string; label: string; shortLabel: string; swatch: string }} ThemePreset */

/** @type {ThemePreset[]} */
export const THEME_PRESETS = [
  { id: 'light', label: 'Açık mod', shortLabel: 'Açık', swatch: '#ffffff' },
  { id: 'dark', label: 'Koyu mod', shortLabel: 'Koyu', swatch: '#1c1c1f' },
];

/** Eski çoklu koyu palet kayıtlarını tek koyu moda indirger. */
export function normalizeThemeId(id) {
  if (id === 'dark' || (typeof id === 'string' && id.startsWith('dark-'))) return 'dark';
  return 'light';
}

export function isValidThemeId(id) {
  return id === 'light' || id === 'dark';
}

export function isDarkThemeId(id) {
  return id === 'dark';
}
