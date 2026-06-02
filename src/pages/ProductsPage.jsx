import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CatalogProductCard from '../components/products/CatalogProductCard.jsx';
import { CATEGORY_OPTIONS, SORT_OPTIONS } from '../data/catalogMock.js';
import { enabledSkinFilterChoices, normalizeSkinCatalogRows } from '../lib/skinFilterCatalog.js';
import { formatTRY } from '../lib/formatTRY.js';
import { apiFetch } from '../api/client.js';
import { mapApiProductToCatalog } from '../lib/productMap.js';

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const tagFilter = String(searchParams.get('tag') || '').trim();

  const [sortBy, setSortBy] = useState('recommended');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(() => new Set());
  const [selectedSkinTypes, setSelectedSkinTypes] = useState(() => new Set());
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [skinCatalogRows, setSkinCatalogRows] = useState(() => normalizeSkinCatalogRows());

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setLoadError('');
    Promise.all([
      apiFetch('/api/products', { skipAuth: true, signal: ac.signal }),
      apiFetch('/api/settings', { skipAuth: true, signal: ac.signal }),
    ])
      .then(([pr, sr]) => {
        const skinNorm = normalizeSkinCatalogRows(sr?.data?.settings?.skinFilterOptions);
        setSkinCatalogRows(skinNorm);
        const raw = Array.isArray(pr?.data?.products) ? pr.data.products : [];
        setProducts(raw.map((row) => mapApiProductToCatalog(row, skinNorm)));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err.message || 'Ürünler yüklenemedi.');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const skinFilterSidebarOptions = useMemo(
    () => enabledSkinFilterChoices(skinCatalogRows),
    [skinCatalogRows],
  );

  const mergedCategoryOptions = useMemo(() => {
    const set = new Set(CATEGORY_OPTIONS);
    products.forEach((p) => p.categories.forEach((c) => set.add(c)));
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [products]);

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

  return (
    <main className="border-b border-neutral-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:gap-10 lg:px-8 lg:py-10">
        <aside className="mb-10 w-full shrink-0 lg:mb-0 lg:w-[280px] lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
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
                  <p className="text-xs text-neutral-500">Sonuç yok.</p>
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
        </aside>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-asta-navy sm:text-[2.25rem]">
            {tagFilter === 'cok-satan' ? 'Çok satan ürünler' : 'Tüm Ürünler'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {loading ? 'Ürünler yükleniyor…' : `${visibleProducts.length} ürün listeleniyor`}
          </p>

          {loadError && (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {loadError}
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
            {visibleProducts.map((p) => (
              <CatalogProductCard
                key={p.id}
                brand={p.brand}
                name={p.name}
                priceLabel={formatTRY(p.price)}
                image={p.image || placeholderSvg}
                product={{
                  id: p.id,
                  slug: p.slug,
                  brand: p.brand,
                  name: p.name,
                  price: p.price,
                  image: p.image || placeholderSvg,
                  variants: p.variants,
                }}
              />
            ))}
          </div>

          {!loading && visibleProducts.length === 0 && !loadError && (
            <p className="mt-12 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center text-neutral-600">
              Seçtiğiniz filtrelere uygun ürün bulunamadı.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
