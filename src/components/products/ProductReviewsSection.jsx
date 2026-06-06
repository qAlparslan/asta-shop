import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { mediaUrl } from '../../lib/mediaUrl.js';
import StarRating from '../StarRating.jsx';

const SORT_OPTIONS = [
  { value: 'newest', label: 'En yeni' },
  { value: 'oldest', label: 'En eski' },
  { value: 'highest', label: 'En yüksek puan' },
  { value: 'lowest', label: 'En düşük puan' },
];

function formatReviewDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function ReviewImageLightbox({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Kapat"
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function ratingCountsFromReviews(reviews) {
  /** @type {Record<number, number>} */
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const n = Math.floor(Number(r.rating));
    if (n >= 1 && n <= 5) counts[n] += 1;
  }
  return counts;
}

/**
 * @param {{ productId: string; initialStats?: { reviewCount?: number; averageRating?: number } }} props
 */
export default function ProductReviewsSection({ productId, initialStats }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    reviewCount: initialStats?.reviewCount ?? 0,
    averageRating: initialStats?.averageRating ?? 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  const [eligibility, setEligibility] = useState(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [previews, setPreviews] = useState(/** @type {string[]} */ ([]));
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [formErr, setFormErr] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [starFilter, setStarFilter] = useState(/** @type {number | null} */ (null));
  const [sortBy, setSortBy] = useState('newest');
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  const loadReviews = useCallback(() => {
    if (!productId) return Promise.resolve();
    setLoading(true);
    setLoadErr('');
    return apiFetch(`/api/products/${encodeURIComponent(productId)}/reviews`, { skipAuth: true })
      .then((res) => {
        setReviews(Array.isArray(res?.data?.reviews) ? res.data.reviews : []);
        if (res?.data?.stats) setStats(res.data.stats);
      })
      .catch((e) => setLoadErr(e.message || 'Yorumlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [productId]);

  const loadEligibility = useCallback(() => {
    if (!productId) return Promise.resolve();
    return apiFetch(`/api/products/${encodeURIComponent(productId)}/reviews/eligibility`)
      .then((res) => setEligibility(res?.data ?? null))
      .catch(() => setEligibility(null));
  }, [productId]);

  useEffect(() => {
    loadReviews();
    loadEligibility();
  }, [loadReviews, loadEligibility]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const ratingCounts = useMemo(() => ratingCountsFromReviews(reviews), [reviews]);

  const displayedReviews = useMemo(() => {
    let list = [...reviews];
    if (starFilter != null) {
      list = list.filter((r) => Math.floor(Number(r.rating)) === starFilter);
    }
    list.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      const ra = Number(a.rating) || 0;
      const rb = Number(b.rating) || 0;
      if (sortBy === 'oldest') return ta - tb;
      if (sortBy === 'highest') return rb - ra || tb - ta;
      if (sortBy === 'lowest') return ra - rb || tb - ta;
      return tb - ta;
    });
    return list;
  }, [reviews, starFilter, sortBy]);

  const reviewCount = Math.max(0, Number(stats.reviewCount) || 0);
  const avgRating = reviewCount > 0 ? Number(stats.averageRating) || 0 : 0;

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 4);
    e.target.value = '';
    setFiles(picked);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const openReviewForm = () => {
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setFormMsg('');
    setFormErr('');
    if (!eligibility?.canReview) {
      setFormErr('Bu ürüne yorum yapma yetkiniz yok.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setFormErr('Lütfen 1–5 arası puan verin.');
      return;
    }
    if (body.trim().length < 4) {
      setFormErr('Yorum en az 4 karakter olmalı.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('rating', String(rating));
      fd.append('body', body.trim());
      files.forEach((f) => fd.append('images', f));

      await apiFetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        body: fd,
      });

      setFormMsg('Yorumunuz yayınlandı. Teşekkür ederiz.');
      setBody('');
      setRating(5);
      setFiles([]);
      setShowForm(false);
      await Promise.all([loadReviews(), loadEligibility()]);
    } catch (ex) {
      setFormErr(typeof ex.message === 'string' ? ex.message : 'Yorum gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold text-brand sm:text-xl">
              Yorumlar ({reviewCount})
            </h2>
            {reviewCount > 0 ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StarRating value={avgRating} size="md" />
                <span className="text-sm text-neutral-600">
                  <span className="font-semibold text-asta-navy">{avgRating.toFixed(1)}</span> Ortalama
                  Puan
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">Henüz yorum yok.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <label className="sr-only" htmlFor="review-sort">
              Sıralama
            </label>
            <select
              id="review-sort"
              value={sortBy}
              onChange={(ev) => setSortBy(ev.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-asta-navy outline-none ring-brand focus:border-brand/40 focus:ring-2"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openReviewForm}
              className="rounded-lg bg-brand px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-hover"
            >
              Yorum yap
            </button>
          </div>
        </div>
      </div>

      {reviewCount > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          <button
            type="button"
            onClick={() => setStarFilter(null)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-left transition ${
              starFilter === null
                ? 'border-brand bg-brand/5 ring-1 ring-brand/20'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <span className="text-xs font-bold text-brand">Tümü</span>
            <p className="mt-0.5 text-[11px] text-neutral-500">{reviewCount}</p>
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingCounts[stars] || 0;
            if (count === 0) return null;
            const active = starFilter === stars;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setStarFilter(active ? null : stars)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? 'border-brand bg-brand/5 ring-1 ring-brand/20'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <span className="text-xs font-bold text-brand">{stars} Yıldız</span>
                <div className="mt-1">
                  <StarRating value={stars} size="sm" />
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">{count}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-neutral-500">Yorumlar yükleniyor…</p> : null}
      {loadErr ? <p className="text-sm text-red-600">{loadErr}</p> : null}

      {!loading && displayedReviews.length > 0 ? (
        <ul className="space-y-4">
          {displayedReviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={r.rating} size="sm" />
                <span className="text-sm font-semibold text-asta-navy">{r.authorName}</span>
                <span className="text-xs text-neutral-400">{formatReviewDate(r.createdAt)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{r.body}</p>
              {Array.isArray(r.images) && r.images.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map((imgPath) => {
                    const src = mediaUrl(imgPath);
                    return (
                      <button
                        key={imgPath}
                        type="button"
                        onClick={() => setLightboxSrc(src)}
                        className="h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:ring-2 hover:ring-brand/30 sm:h-20 sm:w-20"
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && reviews.length > 0 && displayedReviews.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
          Bu filtreye uygun yorum bulunamadı.
        </p>
      ) : null}

      {(showForm || reviewCount === 0) ? (
        <div
          ref={formRef}
          className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-asta-navy">Yorum yaz</h3>
            {showForm && reviewCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs font-semibold text-neutral-500 hover:text-asta-navy"
              >
                Kapat
              </button>
            ) : null}
          </div>
          {eligibility?.canReview ? (
            <form onSubmit={submitReview} className="mt-4 space-y-4">
              {eligibility.reviewCount > 0 && eligibility.remainingReviews > 0 ? (
                <p className="text-xs text-neutral-500">
                  Yeni siparişiniz için yorum yazabilirsiniz
                  {eligibility.remainingReviews > 1
                    ? ` (${eligibility.remainingReviews} hak kaldı)`
                    : ''}
                  .
                </p>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Puanınız</p>
                <StarRating
                  value={rating}
                  size="md"
                  interactive
                  onChange={setRating}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Yorumunuz
                </label>
                <textarea
                  rows={5}
                  value={body}
                  onChange={(ev) => setBody(ev.target.value)}
                  maxLength={4000}
                  className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none ring-brand focus:border-brand/40 focus:ring-2"
                  placeholder="Ürün deneyiminizi paylaşın…"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Fotoğraf (en fazla 4)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={onPickFiles}
                  className="mt-2 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-asta-navy"
                />
                {previews.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previews.map((src, i) => (
                      <div key={src} className="relative">
                        <img src={src} alt="" className="h-16 w-16 rounded-lg border object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white"
                          aria-label="Fotoğrafı kaldır"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {formErr ? <p className="text-sm text-red-600">{formErr}</p> : null}
              {formMsg ? <p className="text-sm text-green-700">{formMsg}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {submitting ? 'Gönderiliyor…' : 'Yorumu gönder'}
              </button>
            </form>
          ) : eligibility?.reason === 'all_reviews_used' ? (
            <p className="mt-3 text-sm text-neutral-600">
              Bu ürün için mevcut siparişlerinize ait yorum hakkınızı kullandınız. Aynı ürünü tekrar
              satın aldığınızda yeni yorum yazabilirsiniz.
            </p>
          ) : eligibility?.reason === 'login_required' ? (
            <p className="mt-3 text-sm text-neutral-600">
              Yorum yapmak için{' '}
              <Link to="/giris" className="font-semibold text-brand hover:underline">
                giriş yapın
              </Link>
              . Yalnızca ürünü satın alan üyeler yorum bırakabilir.
            </p>
          ) : eligibility?.reason === 'not_purchased' ? (
            <p className="mt-3 text-sm text-neutral-600">
              Yorum yapabilmek için bu ürünü satın almış olmanız gerekir.
            </p>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">Şu anda yorum yapılamıyor.</p>
          )}
        </div>
      ) : null}

      {lightboxSrc ? (
        <ReviewImageLightbox src={lightboxSrc} alt="Yorum fotoğrafı" onClose={() => setLightboxSrc('')} />
      ) : null}
    </div>
  );
}
