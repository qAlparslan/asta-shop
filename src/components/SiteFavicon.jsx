import { useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { applyFaviconFromLogo } from '../lib/siteFavicon.js';

export default function SiteFavicon() {
  useEffect(() => {
    apiFetch('/api/settings', { skipAuth: true })
      .then((res) => {
        const logoUrl = res?.data?.settings?.logoUrl;
        applyFaviconFromLogo(logoUrl);
      })
      .catch(() => applyFaviconFromLogo(''));
  }, []);

  return null;
}
