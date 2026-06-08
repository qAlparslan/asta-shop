import { useEffect } from 'react';
import { applyPageSeo } from '../lib/siteSeo.js';

/**
 * @param {{
 *   title?: string;
 *   description?: string;
 *   canonical?: string;
 *   ogType?: string;
 *   jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
 * }} props
 */
export default function PageSeo({ title, description, canonical, ogType, jsonLd }) {
  useEffect(() => {
    applyPageSeo({ title, description, canonical, ogType, jsonLd });
  }, [title, description, canonical, ogType, jsonLd]);

  return null;
}
