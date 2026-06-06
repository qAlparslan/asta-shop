import { useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { applyFaviconFromLogo } from '../lib/siteFavicon.js';
import { applySiteDocumentTitle } from '../lib/siteDocumentTitle.js';

export default function SiteBranding() {
  useEffect(() => {
    apiFetch('/api/settings', { skipAuth: true })
      .then((res) => {
        const settings = res?.data?.settings ?? {};
        applyFaviconFromLogo(settings.logoUrl);
        applySiteDocumentTitle(settings);
      })
      .catch(() => {
        applyFaviconFromLogo('');
        applySiteDocumentTitle({});
      });
  }, []);

  return null;
}
