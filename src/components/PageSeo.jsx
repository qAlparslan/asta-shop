import { useEffect } from 'react';
import { applyPageSeo } from '../lib/siteSeo.js';

/**
 * @param {{
 *   title?: string;
 *   description?: string;
 *   canonical?: string;
 *   ogType?: string;
 *   ogImage?: string;
 *   siteName?: string;
 *   robots?: string;
 *   jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
 * }} props
 */
export default function PageSeo({
  title,
  description,
  canonical,
  ogType,
  ogImage,
  siteName,
  robots,
  jsonLd,
}) {
  useEffect(() => {
    applyPageSeo({ title, description, canonical, ogType, ogImage, siteName, robots, jsonLd });
  }, [title, description, canonical, ogType, ogImage, siteName, robots, jsonLd]);

  return null;
}
