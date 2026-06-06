import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
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

const FILTERS = [
  { id: 'unanswered', label: 'Cevap bekleyen' },
  { id: 'answered', label: 'Cevaplanan' },
  { id: 'all', label: 'Tümü' },
];

export default function AdminProductQuestionsPage() {
  const [filter, setFilter] = useState('unanswered');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [draftAnswers, setDraftAnswers] = useState(/** @type {Record<string, string>} */ ({}));

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ status: filter, limit: '200' });
    return apiFetch(`/api/admin/product-questions?${qs.toString()}`)
      .then((res) => {
        const rows = Array.isArray(res?.data?.questions) ? res.data.questions : [];
        setQuestions(rows);
        setDraftAnswers((prev) => {
          const next = { ...prev };
          for (const q of rows) {
            if (!(q.id in next)) {
              next[q.id] = typeof q.answer === 'string' ? q.answer : '';
            }
          }
          return next;
        });
      })
      .catch((e) => setError(e.message || 'Sorular yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const submitAnswer = async (id) => {
    const answer = String(draftAnswers[id] || '').trim();
    if (answer.length < 2) {
      window.alert('Cevap en az 2 karakter olmalı.');
      return;
    }
    setBusyId(id);
    setError('');
    try {
      await apiFetch(`/api/admin/product-questions/${id}`, {
        method: 'PATCH',
        body: { answer },
      });
      await load();
    } catch (e) {
      setError(e.message || 'Cevap kaydedilemedi.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Mağaza</p>
        <h2 className="text-xl font-bold text-asta-navy">Müşteri soruları</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Ürün sayfasından gelen soruları yanıtlayın. Cevaplanan sorular müşterilere görünür olur.
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
        <p className="text-sm text-neutral-500">Sorular yükleniyor…</p>
      ) : questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
          Bu filtrede soru bulunamadı.
        </p>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const product = q.product;
            const productPath = product
              ? storefrontProductPath({ id: product.id, slug: product.slug })
              : '/urunler';
            const answered =
              typeof q.answer === 'string' && q.answer.trim().length > 0;

            return (
              <article
                key={q.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-asta-navy">{q.authorName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          answered
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {answered ? 'Cevaplandı' : 'Bekliyor'}
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
                    <p className="mt-1 text-xs text-neutral-400">Soru tarihi: {formatDate(q.createdAt)}</p>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                  {q.question}
                </p>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Satıcı cevabı
                  </label>
                  <textarea
                    rows={4}
                    value={draftAnswers[q.id] ?? ''}
                    onChange={(ev) =>
                      setDraftAnswers((prev) => ({ ...prev, [q.id]: ev.target.value }))
                    }
                    maxLength={4000}
                    className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none ring-brand focus:border-brand/40 focus:ring-2"
                    placeholder="Müşteriye cevabınızı yazın…"
                  />
                  {answered && q.answeredAt ? (
                    <p className="mt-1 text-xs text-neutral-400">
                      Son cevap: {formatDate(q.answeredAt)}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => submitAnswer(q.id)}
                    className="mt-3 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    {busyId === q.id ? 'Kaydediliyor…' : answered ? 'Cevabı güncelle' : 'Cevapla'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
