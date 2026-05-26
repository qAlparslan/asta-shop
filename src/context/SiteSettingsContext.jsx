import { createContext, useContext } from 'react';

/** @typedef {Record<string, unknown>} SettingsMap */

/** @type {React.Context<SettingsMap>} */
const SiteSettingsContext = createContext({});

export function SiteSettingsProvider({ value, children }) {
  return (
    <SiteSettingsContext.Provider value={value && typeof value === 'object' ? value : {}}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

/** Ana site şablonu için `GET /api/settings` → `settings` objesi */
export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
