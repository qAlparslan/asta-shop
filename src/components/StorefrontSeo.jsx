import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import { buildSiteDocumentTitle } from '../lib/siteDocumentTitle.js';
import { assetUrl } from '../config/api.js';
import {
  buildCanonicalUrl,
  buildDefaultSiteDescription,
  excerptPlain,
  toAbsoluteUrl,
} from '../lib/siteSeo.js';
import PageSeo from './PageSeo.jsx';

const NOINDEX_PREFIXES = [
  '/admin',
  '/hesabim',
  '/giris',
  '/uye-ol',
  '/sifre-unuttum',
  '/sifre-sifirla',
  '/sepet',
  '/odeme',
  '/abonelik-onayi',
  '/abonelikten-cik',
];

const ROUTE_SEO = {
  '/': {
    useStoreTitleOnly: true,
    description:
      'Seçilmiş güzellik ve bakım ürünleri. Güvenilir alışveriş, orijinal ürün garantisi ve hızlı kargo.',
  },
  '/urunler': {
    titleSuffix: 'Ürünler',
    description:
      'Tüm güzellik ve bakım ürünlerimizi keşfedin. Kategori ve cilt tipi filtreleriyle size uygun ürünü bulun.',
  },
  '/hakkimizda': {
    titleSuffix: 'Hakkımızda',
    description:
      'Markamız, değerlerimiz ve müşterilerimize sunduğumuz güvenilir online alışveriş deneyimi.',
  },
  '/iletisim': {
    titleSuffix: 'İletişim',
    description:
      'Sipariş, ürün ve destek talepleriniz için bizimle iletişime geçin. Müşteri hizmetleri ve iletişim bilgileri.',
  },
};

/** Ürün detayı kendi SEO bileşenini kullanır. */
export function isProductDetailPath(pathname) {
  return pathname.startsWith('/urun/');
}

/** @param {string} pathname */
function isNoIndexPath(pathname) {
  return NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** @param {string} pathname */
function matchRouteSeo(pathname) {
  if (isProductDetailPath(pathname)) return { skip: true };
  if (pathname === '/urunler') return { skip: true };
  if (pathname.startsWith('/yasal/')) return { skip: true };
  if (isNoIndexPath(pathname)) return { noindex: true };
  return ROUTE_SEO[pathname] || null;
}

/** @param {Record<string, unknown>} settings @param {string} origin */
function resolveOgImage(settings, origin) {
  const logo = typeof settings?.logoUrl === 'string' ? settings.logoUrl.trim() : '';
  if (logo) return assetUrl(logo) || toAbsoluteUrl(logo);
  return origin ? `${origin}/favicon.ico` : '';
}

/** @param {Record<string, unknown>} settings @param {string} siteUrl */
function buildOrganizationJsonLd(settings, siteUrl) {
  const name = String(settings?.storeName ?? '').trim() || 'Asta Ticaret';
  const description = buildDefaultSiteDescription(settings);
  const logoRaw = typeof settings?.logoUrl === 'string' ? settings.logoUrl.trim() : '';
  const logo = logoRaw ? toAbsoluteUrl(assetUrl(logoRaw) || logoRaw) : undefined;
  const origin = siteUrl.replace(/\/$/, '') || undefined;
  const email = String(settings?.footerEmail ?? '').trim() || undefined;
  const phone = String(settings?.footerPhone ?? '').trim() || undefined;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name,
        url: origin,
        ...(logo ? { logo } : {}),
        description,
        ...(email ? { email } : {}),
        ...(phone ? { telephone: phone } : {}),
      },
      {
        '@type': 'WebSite',
        name,
        url: origin,
        inLanguage: 'tr-TR',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/urunler?kategori={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export default function StorefrontSeo() {
  const { pathname } = useLocation();
  const settings = useSiteSettings();

  const seo = useMemo(() => {
    const route = matchRouteSeo(pathname);
    const storeTitle = buildSiteDocumentTitle(settings);
    const storeName = String(settings?.storeName ?? '').trim() || 'Asta Ticaret';
    const defaultDesc = buildDefaultSiteDescription(settings);
    const canonical = buildCanonicalUrl(pathname);
    const origin = buildCanonicalUrl('/');
    const ogImage = resolveOgImage(settings, origin);
    const siteName = storeName;

    if (route?.skip) return null;

    if (route?.noindex) {
      return {
        title: storeTitle,
        description: defaultDesc,
        canonical,
        robots: 'noindex, nofollow',
        ogImage,
        siteName,
        jsonLd: null,
      };
    }

    if (!route) {
      return {
        title: storeTitle,
        description: defaultDesc,
        canonical,
        ogImage,
        siteName,
        ogType: 'website',
        robots: 'index, follow',
        jsonLd: buildOrganizationJsonLd(settings, origin),
      };
    }

    const title = route.useStoreTitleOnly
      ? storeTitle
      : route.titleSuffix
        ? `${route.titleSuffix} | ${storeTitle}`
        : storeTitle;
    const description = route.description || defaultDesc;

    return {
      title,
      description,
      canonical,
      ogImage,
      siteName,
      ogType: 'website',
      robots: 'index, follow',
      jsonLd: buildOrganizationJsonLd(settings, origin),
    };
  }, [pathname, settings]);

  if (!seo) return null;

  return (
    <PageSeo
      title={seo.title}
      description={seo.description}
      canonical={seo.canonical}
      ogType={seo.ogType}
      ogImage={seo.ogImage}
      siteName={seo.siteName}
      robots={seo.robots}
      jsonLd={seo.jsonLd}
    />
  );
}

export { excerptPlain };
