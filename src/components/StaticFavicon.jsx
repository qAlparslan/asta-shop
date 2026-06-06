import { useEffect } from 'react';
import { applySiteFavicon } from '../lib/siteFavicon.js';

export default function StaticFavicon() {
  useEffect(() => {
    applySiteFavicon();
  }, []);

  return null;
}
