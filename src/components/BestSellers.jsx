import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CatalogProductCard from './products/CatalogProductCard.jsx';
import { apiFetch } from '../api/client.js';
import { formatTRY } from '../lib/formatTRY.js';
import { mapApiProductToCatalog } from '../lib/productMap.js';
import { normalizeSkinCatalogRows } from '../lib/skinFilterCatalog.js';

/** Admin paneldeki etiket değeri (`AdminProductsPage` bulk tag) ile aynı olmalı */
const BESTSELLER_TAG = 'cok-satan';
const LIMIT = 8;

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f5f5f5' width='400' height='400'/%3E%3C/svg%3E";

export default function BestSellers() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ tag: BESTSELLER_TAG, limit: String(LIMIT) });
    Promise.all([
      apiFetch(`/api/products?${qs.toString()}`, { skipAuth: true, signal: ac.signal }),
      apiFetch('/api/settings', { skipAuth: true, signal: ac.signal }),
    ])
      .then(([pr, sr]) => {
        const skinNorm = normalizeSkinCatalogRows(sr?.data?.settings?.skinFilterOptions);
        const raw = Array.isArray(pr?.data?.products) ? pr.data.products : [];
        setProducts(raw.map((row) => mapApiProductToCatalog(row, skinNorm)));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Ürünler yüklenemedi.');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <section id="cok-satanlar" className="bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            Çok satan ürünler
          </h2>
          <Link
            to={`/urunler?tag=${encodeURIComponent(BESTSELLER_TAG)}`}
            className="text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            Tümünü gör →
          </Link>
        </div>

        {loading && (
          <p className="mt-8 text-sm text-neutral-500" aria-live="polite">
            Ürünler yükleniyor…
          </p>
        )}

        {error && (
          <div
            className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="mt-8 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
            Henüz «Çok satan» etiketli ürün yok. Yönetim panelinde ürünleri düzenleyip etiket olarak
            «Çok satan» seçtiğinizde burada listelenir.
          </p>
        )}

        {!loading && products.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <CatalogProductCard
                key={p.id}
                brand={p.brand}
                name={p.name}
                priceLabel={formatTRY(p.price)}
                image={p.image || PLACEHOLDER_IMG}
                product={{
                  id: p.id,
                  slug: p.slug,
                  brand: p.brand,
                  name: p.name,
                  price: p.price,
                  image: p.image || PLACEHOLDER_IMG,
                  variants: p.variants,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
