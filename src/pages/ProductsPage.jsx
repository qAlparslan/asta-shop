import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import CatalogProductCard from '../components/products/CatalogProductCard.jsx';
import { CATALOG_PRODUCTS, SORT_OPTIONS, useDemoCatalogFallback } from '../data/catalogMock.js';
import { enabledSkinFilterChoices, normalizeSkinCatalogRows } from '../lib/skinFilterCatalog.js';
import { formatTRY } from '../lib/formatTRY.js';
import { apiFetch } from '../api/client.js';
import { mapApiProductToCatalog } from '../lib/productMap.js';
import PageSeo from '../components/PageSeo.jsx';
import { buildCanonicalUrl } from '../lib/siteSeo.js';
import { buildSiteDocumentTitle } from '../lib/siteDocumentTitle.js';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const settings = useSiteSettings();
  const tagFilter = String(searchParams.get('tag') || '').trim();
  const categoryFilter = String(searchParams.get('kategori') || '').trim();

  const [sortBy, setSortBy] = useState('recommended');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(() => new Set());
  const [selectedSkinTypes, setSelectedSkinTypes] = useState(() => new Set());
  const [products, setProducts] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [skinCatalogRows, setSkinCatalogRows] = useState(() => normalizeSkinCatalogRows());

  const activeFilterCount =
    selectedCategories.size + selectedSkinTypes.size + (sortBy !== 'recommended' ? 1 : 0);

  useEffect(() => {
    if (!mobileFiltersOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileFiltersOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setLoadError('');
    Promise.all([
      apiFetch('/api/products', { skipAuth: true, signal: ac.signal }),
      apiFetch('/api/settings', { skipAuth: true, signal: ac.signal }),
      apiFetch('/api/categories', { skipAuth: true, signal: ac.signal }),
    ])
      .then(([pr, sr, cr]) => {
        const skinNorm = normalizeSkinCatalogRows(sr?.data?.settings?.skinFilterOptions);
        setSkinCatalogRows(skinNorm);
        const raw = Array.isArray(pr?.data?.products) ? pr.data.products : [];
        if (raw.length > 0) {
          setProducts(raw.map((row) => mapApiProductToCatalog(row, skinNorm)));
        } else if (useDemoCatalogFallback()) {
          setProducts(CATALOG_PRODUCTS);
        }
        const cats = Array.isArray(cr?.data?.categories) ? cr.data.categories : [];
        setCatalogCategories(cats);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (useDemoCatalogFallback()) {
          setProducts(CATALOG_PRODUCTS);
          return;
        }
        setLoadError(err.message || 'Ürünler yüklenemedi.');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const skinFilterSidebarOptions = useMemo(
    () => enabledSkinFilterChoices(skinCatalogRows),
    [skinCatalogRows],
  );

  const mergedCategoryOptions = useMemo(() => {
    return catalogCategories
      .map((c) => String(c?.name ?? '').trim())
      .filter(Boolean);
  }, [catalogCategories]);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return mergedCategoryOptions;
    return mergedCategoryOptions.filter((c) => c.toLowerCase().includes(q));
  }, [categoryQuery, mergedCategoryOptions]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleSkin = (skin) => {
    setSelectedSkinTypes((prev) => {
      const next = new Set(prev);
      if (next.has(skin)) next.delete(skin);
      else next.add(skin);
      return next;
    });
  };

  const visibleProducts = useMemo(() => {
    let list = [...products];

    if (tagFilter) {
      list = list.filter((p) => p.tag === tagFilter);
    }

    if (selectedCategories.size > 0) {
      list = list.filter((p) => p.categories.some((c) => selectedCategories.has(c)));
    }
    if (selectedSkinTypes.size > 0) {
      list = list.filter((p) => p.skinTypes.some((s) => selectedSkinTypes.has(s)));
    }

    switch (sortBy) {
      case 'nameAsc':
        list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        break;
      case 'nameDesc':
        list.sort((a, b) => b.name.localeCompare(a.name, 'tr'));
        break;
      case 'priceAsc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'recommended':
      default:
        break;
    }

    return list;
  }, [sortBy, selectedCategories, selectedSkinTypes, products, tagFilter]);

  const fieldClass = 'space-y-3';
  const legendClass = 'text-sm font-bold text-asta-navy';
  const labelRow = 'flex cursor-pointer items-start gap-2.5 text-sm text-neutral-800';
  const checkClass =
    'mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-brand accent-[#9f2133] focus:ring-brand';

  const placeholderSvg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f5f5f5' width='400' height='400'/%3E%3C/svg%3E";

  const filtersPanel = (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm lg:shadow-sm">
      <fieldset className={fieldClass}>
        <legend className={legendClass}>Sıralama</legend>
        <div className="space-y-2.5 border-b border-neutral-100 pb-6">
          {SORT_OPTIONS.map((opt) => (
            <label key={opt.id} className={labelRow}>
              <input
                type="radio"
                name="catalog-sort"
                value={opt.id}
                checked={sortBy === opt.id}
                onChange={() => setSortBy(opt.id)}
                className="mt-1 h-4 w-4 shrink-0 border-neutral-300 accent-[#9f2133] focus:ring-brand"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={`${fieldClass} border-b border-neutral-100 pb-6 pt-6`}>
        <legend className={legendClass}>Kategori</legend>
        <input
          type="search"
          value={categoryQuery}
          onChange={(e) => setCategoryQuery(e.target.value)}
          placeholder="Kategori ara"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-brand ring-offset-2 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2"
          autoComplete="off"
        />
        <div className="max-h-52 space-y-2.5 overflow-y-auto pr-1 pt-1">
          {filteredCategories.map((cat) => (
            <label key={cat} className={labelRow}>
              <input
                type="checkbox"
                checked={selectedCategories.has(cat)}
                onChange={() => toggleCategory(cat)}
                className={checkClass}
              />
              <span>{cat}</span>
            </label>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-xs text-neutral-500">
              {mergedCategoryOptions.length === 0
                ? 'Şu anda listelenecek kategori yok.'
                : 'Sonuç yok.'}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className={`${fieldClass} pt-6`}>
        <legend className={legendClass}>Cilt tipi</legend>
        <div className="space-y-2.5">
          {skinFilterSidebarOptions.map((skin) => (
            <label key={skin.slug} className={labelRow}>
              <input
                type="checkbox"
                checked={selectedSkinTypes.has(skin.label)}
                onChange={() => toggleSkin(skin.label)}
                className={checkClass}
              />
              <span>{skin.label}</span>
            </label>
          ))}
          {skinFilterSidebarOptions.length === 0 ? (
            <p className="text-xs text-neutral-500">Şu anda listelenecek cilt filtresi yok.</p>
          ) : null}
        </div>
      </fieldset>
    </div>
  );

  const catalogSeo = useMemo(() => {
    const storeTitle = buildSiteDocumentTitle(settings);
    const storeName = String(settings?.storeName ?? '').trim() || 'Asta Ticaret';
    let pageTitle = 'Tüm Ürünler';
    let description = `${storeName} ürün kataloğu. Güzellik ve bakım ürünlerinde güvenilir online alışveriş.`;

    if (tagFilter === 'cok-satan') {
      pageTitle = 'Çok Satan Ürünler';
      description = `${storeName} en çok satan güzellik ve bakım ürünleri. Müşteri favorileri ve kampanyalı seçenekler.`;
    } else if (categoryFilter) {
      pageTitle = `${categoryFilter} Ürünleri`;
      description = `${categoryFilter} kategorisindeki ürünler — ${storeName} online mağaza.`;
    }

    const qs = new URLSearchParams();
    if (tagFilter) qs.set('tag', tagFilter);
    if (categoryFilter) qs.set('kategori', categoryFilter);
    const path = qs.toString() ? `/urunler?${qs.toString()}` : '/urunler';

    return {
      title: `${pageTitle} | ${storeTitle}`,
      description,
      canonical: buildCanonicalUrl(path),
    };
  }, [settings, tagFilter, categoryFilter]);

  return (
    <>
      <PageSeo
        title={catalogSeo.title}
        description={catalogSeo.description}
        canonical={catalogSeo.canonical}
        ogType="website"
        robots="index, follow"
        siteName={String(settings?.storeName ?? '').trim() || 'Asta Ticaret'}
      />
    <main className="border-b border-neutral-100 bg-theme-page">
      {mobileFiltersOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw,320px)] flex-col bg-white shadow-xl lg:hidden"
            aria-modal
            role="dialog"
            aria-labelledby="mobile-filters-title"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h2 id="mobile-filters-title" className="text-base font-bold text-asta-navy">
                Filtreler
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
                aria-label="Filtreleri kapat"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{filtersPanel}</div>
            <div className="border-t border-neutral-200 p-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90"
              >
                Uygula
              </button>
            </div>
          </aside>
        </>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:gap-10 lg:px-8 lg:py-10">
        <aside className="hidden lg:block lg:w-[280px] lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
          {filtersPanel}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-asta-navy sm:text-[2.25rem]">
                {tagFilter === 'cok-satan' ? 'Çok satan ürünler' : 'Tüm Ürünler'}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                {loading ? 'Ürünler yükleniyor…' : `${visibleProducts.length} ürün listeleniyor`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-asta-navy shadow-sm hover:bg-neutral-50 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
              Filtre
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          {loadError && (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {loadError}
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 items-stretch gap-3 sm:gap-6 xl:grid-cols-3">
            {visibleProducts.map((p) => (
              <CatalogProductCard
                key={p.id}
                brand={p.brand}
                name={p.name}
                priceLabel={formatTRY(p.price)}
                image={p.image || placeholderSvg}
                product={p}
              />
            ))}
          </div>

          {!loading && visibleProducts.length === 0 && !loadError && (
            <p className="mt-12 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center text-neutral-600">
              {products.length === 0
                ? 'Henüz listelenecek ürün yok.'
                : selectedCategories.size > 0 || selectedSkinTypes.size > 0 || tagFilter
                  ? 'Seçtiğiniz filtrelere uygun ürün bulunamadı.'
                  : 'Henüz listelenecek ürün yok.'}
            </p>
          )}
        </div>
      </div>
    </main>
    </>
  );
}
