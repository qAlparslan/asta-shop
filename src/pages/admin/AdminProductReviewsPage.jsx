import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import StarRating from '../../components/StarRating.jsx';
import { mediaUrl } from '../../lib/mediaUrl.js';
import { storefrontProductPath } from '../../lib/productPaths.js';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function parseImages(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      return [];
    }
  }
  return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
}

const FILTERS = [
  { id: 'pending', label: 'Bekleyen' },
  { id: 'approved', label: 'Yayında' },
  { id: 'all', label: 'Tümü' },
];

export default function AdminProductReviewsPage() {
  const [filter, setFilter] = useState('all');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ status: filter, limit: '200' });
    return apiFetch(`/api/admin/product-reviews?${qs.toString()}`)
      .then((res) => setReviews(Array.isArray(res?.data?.reviews) ? res.data.reviews : []))
      .catch((e) => setError(e.message || 'Yorumlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const setApproval = async (id, approved) => {
    setBusyId(id);
    setError('');
    try {
      await apiFetch(`/api/admin/product-reviews/${id}`, {
        method: 'PATCH',
        body: { approved },
      });
      await load();
    } catch (e) {
      setError(e.message || 'İşlem başarısız.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Mağaza</p>
        <h2 className="text-xl font-bold text-asta-navy">Ürün yorumları</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Müşteri yorumlarını onaylayın veya yayından kaldırın. Onaylı yorumlar ürün kartlarında ve
          ürün sayfasında görünür.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === f.id
                ? 'bg-brand text-white shadow-sm'
                : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Yorumlar yükleniyor…</p>
      ) : reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
          Bu filtrede yorum bulunamadı.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const images = parseImages(r.images);
            const product = r.product;
            const productPath = product
              ? storefrontProductPath({ id: product.id, slug: product.slug })
              : '/urunler';
            const approved = Boolean(r.approved);

            return (
              <article
                key={r.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={r.rating} size="sm" />
                      <span className="text-sm font-semibold text-asta-navy">{r.authorName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          approved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {approved ? 'Yayında' : 'Bekliyor'}
                      </span>
                    </div>
                    {product?.name ? (
                      <p className="mt-1 text-sm text-neutral-600">
                        Ürün:{' '}
                        <Link to={productPath} className="font-semibold text-brand hover:underline">
                          {product.name}
                        </Link>
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-neutral-400">{formatDate(r.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!approved ? (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setApproval(r.id, true)}
                        className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                      >
                        Onayla
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setApproval(r.id, false)}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        Yayından kaldır
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                  {r.body}
                </p>

                {images.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((path) => (
                      <a
                        key={path}
                        href={mediaUrl(path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-14 w-14 overflow-hidden rounded-lg border border-neutral-200"
                      >
                        <img src={mediaUrl(path)} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
