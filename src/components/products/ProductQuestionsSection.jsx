import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { maskReviewerName } from '../../lib/maskReviewerName.js';

function formatQuestionDate(iso) {
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

/**
 * @param {{ productId: string; initialCount?: number }} props
 */
export default function ProductQuestionsSection({ productId, initialCount = 0 }) {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ questionCount: initialCount });
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  const [eligibility, setEligibility] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [formErr, setFormErr] = useState('');
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  const loadQuestions = useCallback(() => {
    if (!productId) return Promise.resolve();
    setLoading(true);
    setLoadErr('');
    return apiFetch(`/api/products/${encodeURIComponent(productId)}/questions`)
      .then((res) => {
        setQuestions(Array.isArray(res?.data?.questions) ? res.data.questions : []);
        if (res?.data?.stats) setStats(res.data.stats);
      })
      .catch((e) => setLoadErr(e.message || 'Sorular yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [productId]);

  const loadEligibility = useCallback(() => {
    if (!productId) return Promise.resolve();
    return apiFetch(`/api/products/${encodeURIComponent(productId)}/questions/eligibility`)
      .then((res) => setEligibility(res?.data ?? null))
      .catch(() => setEligibility(null));
  }, [productId]);

  useEffect(() => {
    loadQuestions();
    loadEligibility();
  }, [loadQuestions, loadEligibility]);

  const questionCount = Math.max(0, Number(stats.questionCount) || 0);

  const openQuestionForm = () => {
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    setFormMsg('');
    setFormErr('');
    if (!eligibility?.canAsk) {
      setFormErr('Soru sormak için giriş yapmalısınız.');
      return;
    }
    if (questionText.trim().length < 4) {
      setFormErr('Soru en az 4 karakter olmalı.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${encodeURIComponent(productId)}/questions`, {
        method: 'POST',
        body: { question: questionText.trim() },
      });
      setFormMsg('Sorunuz alındı. Satıcı cevapladığında burada görünecek.');
      setQuestionText('');
      setShowForm(false);
      await Promise.all([loadQuestions(), loadEligibility()]);
    } catch (ex) {
      setFormErr(typeof ex.message === 'string' ? ex.message : 'Soru gönderilemedi.');
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
              Müşteri soruları ({questionCount})
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Satın almadan önce ürün hakkında soru sorabilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={openQuestionForm}
            className="rounded-lg bg-brand px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            Soru sor
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-neutral-500">Sorular yükleniyor…</p> : null}
      {loadErr ? <p className="text-sm text-red-600">{loadErr}</p> : null}

      {!loading && questions.length > 0 ? (
        <ul className="space-y-4">
          {questions.map((q) => (
            <li key={q.id} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-asta-navy">
                  {maskReviewerName(q.authorName)}
                </span>
                <span className="text-xs text-neutral-400">{formatQuestionDate(q.createdAt)}</span>
                {!q.isAnswered ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Cevap bekleniyor
                  </span>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-asta-navy">
                {q.question}
              </p>
              {q.isAnswered && q.answer ? (
                <div className="mt-4 rounded-lg border border-brand/15 bg-white p-3 sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand">
                    Satıcı cevabı
                    {q.answeredAt ? (
                      <span className="ml-2 font-normal normal-case text-neutral-400">
                        {formatQuestionDate(q.answeredAt)}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                    {q.answer}
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
          Henüz cevaplanmış soru yok. İlk soruyu siz sorun.
        </p>
      ) : null}

      {showForm || questionCount === 0 ? (
        <div ref={formRef} className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-asta-navy">Soru yaz</h3>
            {showForm && questionCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs font-semibold text-neutral-500 hover:text-asta-navy"
              >
                Kapat
              </button>
            ) : null}
          </div>
          {eligibility?.canAsk ? (
            <form onSubmit={submitQuestion} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Sorunuz
                </label>
                <textarea
                  rows={4}
                  value={questionText}
                  onChange={(ev) => setQuestionText(ev.target.value)}
                  maxLength={2000}
                  className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none ring-brand focus:border-brand/40 focus:ring-2"
                  placeholder="Ürün hakkında merak ettiklerinizi yazın…"
                />
              </div>
              {formErr ? <p className="text-sm text-red-600">{formErr}</p> : null}
              {formMsg ? <p className="text-sm text-green-700">{formMsg}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {submitting ? 'Gönderiliyor…' : 'Soruyu gönder'}
              </button>
            </form>
          ) : eligibility?.reason === 'login_required' ? (
            <p className="mt-3 text-sm text-neutral-600">
              Soru sormak için{' '}
              <Link to="/giris" className="font-semibold text-brand hover:underline">
                giriş yapın
              </Link>
              . Üye olmanız yeterlidir; ürünü satın almış olmanız gerekmez.
            </p>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">Şu anda soru gönderilemiyor.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
