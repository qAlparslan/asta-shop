import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import { buildSiteDocumentTitle } from '../lib/siteDocumentTitle.js';
import {
  buildCanonicalUrl,
  buildDefaultSiteDescription,
  excerptPlain,
} from '../lib/siteSeo.js';
import PageSeo from './PageSeo.jsx';

const ROUTE_SEO = {
  '/': {
    titleSuffix: 'Ana Sayfa',
    description:
      'Seçilmiş güzellik ve bakım ürünleri. Güvenilir alışveriş, orijinal ürün garantisi ve hızlı kargo.',
  },
  '/magaza': {
    titleSuffix: 'Mağaza',
    description: 'Tüm ürünlerimizi keşfedin. Kategori ve filtrelerle size uygun ürünü bulun.',
  },
  '/urunler': {
    titleSuffix: 'Mağaza',
    description: 'Tüm ürünlerimizi keşfedin. Kategori ve filtrelerle size uygun ürünü bulun.',
  },
  '/hakkimizda': {
    titleSuffix: 'Hakkımızda',
    description: 'Markamız, değerlerimiz ve müşterilerimize sunduğumuz güvenilir alışveriş deneyimi.',
  },
  '/iletisim': {
    titleSuffix: 'İletişim',
    description: 'Sorularınız ve destek talepleriniz için bizimle iletişime geçin.',
  },
  '/sepet': {
    titleSuffix: 'Sepet',
    description: 'Sepetinizdeki ürünleri görüntüleyin ve alışverişinizi tamamlayın.',
  },
};

/** Ürün detayı kendi SEO bileşenini kullanır. */
export function isProductDetailPath(pathname) {
  return pathname.startsWith('/urun/');
}

/** @param {string} pathname */
function matchRouteSeo(pathname) {
  if (isProductDetailPath(pathname)) return { skip: true };
  if (pathname.startsWith('/hesabim')) {
    return {
      titleSuffix: 'Hesabım',
      description: 'Siparişlerinizi ve hesap bilgilerinizi yönetin.',
      noindex: true,
    };
  }
  if (pathname === '/giris' || pathname === '/uye-ol') {
    return { titleSuffix: 'Giriş', description: 'Hesabınıza giriş yapın veya yeni üyelik oluşturun.', noindex: true };
  }
  return ROUTE_SEO[pathname] || null;
}

export default function StorefrontSeo() {
  const { pathname } = useLocation();
  const settings = useSiteSettings();

  const seo = useMemo(() => {
    const route = matchRouteSeo(pathname);
    const storeTitle = buildSiteDocumentTitle(settings);
    const defaultDesc = buildDefaultSiteDescription(settings);
    const canonical = buildCanonicalUrl(pathname);

    if (route?.skip) return null;

    if (!route) {
      return {
        title: storeTitle,
        description: defaultDesc,
        canonical,
        ogType: 'website',
        jsonLd: buildOrganizationJsonLd(settings, canonical),
      };
    }

    const title = route.titleSuffix ? `${route.titleSuffix} | ${storeTitle}` : storeTitle;
    const description = route.description || defaultDesc;

    return {
      title,
      description,
      canonical,
      ogType: 'website',
      jsonLd: route.noindex ? null : buildOrganizationJsonLd(settings, buildCanonicalUrl('/')),
    };
  }, [pathname, settings]);

  if (!seo) return null;

  return (
    <PageSeo
      title={seo.title}
      description={seo.description}
      canonical={seo.canonical}
      ogType={seo.ogType}
      jsonLd={seo.jsonLd}
    />
  );
}

/** @param {Record<string, unknown>} settings @param {string} siteUrl */
function buildOrganizationJsonLd(settings, siteUrl) {
  const name = String(settings?.storeName ?? '').trim() || 'Asta Ticaret';
  const description = buildDefaultSiteDescription(settings);
  const logo = typeof settings?.logoUrl === 'string' && settings.logoUrl.trim() ? settings.logoUrl.trim() : undefined;
  const origin = siteUrl.replace(/\/$/, '') || undefined;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name,
        url: origin,
        ...(logo ? { logo } : {}),
        description,
      },
      {
        '@type': 'WebSite',
        name,
        url: origin,
        inLanguage: 'tr-TR',
      },
    ],
  };
}

export { excerptPlain };
