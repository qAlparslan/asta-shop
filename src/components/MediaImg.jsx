import { useEffect, useState } from 'react';
import { mediaUrl } from '../lib/mediaUrl.js';

/**
 * `/uploads/...` yolu — önce /api/media, 404 olursa doğrudan /uploads/ (Nginx ^~ proxy).
 * @param {{ storedPath: string; className?: string; alt?: string }} props
 */
export default function MediaImg({ storedPath, className, alt = '' }) {
  const raw = typeof storedPath === 'string' ? storedPath.trim() : '';
  const fallback =
    raw && !/^https?:\/\//i.test(raw) ? (raw.startsWith('/') ? raw : `/${raw}`) : '';
  const primary = raw ? mediaUrl(raw) : '';
  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(primary);
  }, [primary]);

  if (!primary) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (fallback && src !== fallback) setSrc(fallback);
      }}
    />
  );
}
