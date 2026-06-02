import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';
import { apiFetch } from '../api/client.js';

/**
 * Bülten onay / abonelik iptali sonuç sayfası.
 * mode: 'confirm'  → GET /api/newsletter/confirm/:token
 * mode: 'unsubscribe' → GET /api/newsletter/unsubscribe/:token
 */
export default function NewsletterActionPage({ mode = 'confirm' }) {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  const isConfirm = mode === 'confirm';
  const heading = isConfirm ? 'Bülten aboneliği' : 'Abonelik iptali';

  useEffect(() => {
    if (ran.current) return; // StrictMode çift çağrı koruması
    ran.current = true;

    if (!token) {
      setState('error');
      setMessage('Geçersiz bağlantı.');
      return;
    }

    const path = isConfirm
      ? `/api/newsletter/confirm/${encodeURIComponent(token)}`
      : `/api/newsletter/unsubscribe/${encodeURIComponent(token)}`;

    apiFetch(path, { skipAuth: true })
      .then((res) => {
        setState('success');
        setMessage(
          res?.message ||
            (isConfirm
              ? 'Aboneliğin onaylandı. Hoş geldin!'
              : 'Aboneliğin iptal edildi.'),
        );
      })
      .catch((ex) => {
        setState('error');
        setMessage(
          typeof ex?.message === 'string' && ex.message
            ? ex.message
            : 'Bağlantı geçersiz veya süresi dolmuş olabilir.',
        );
      });
  }, [token, isConfirm]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-5 flex justify-center">
          {state === 'loading' ? (
            <Loader2 className="h-12 w-12 animate-spin text-brand" strokeWidth={1.5} />
          ) : state === 'success' ? (
            isConfirm ? (
              <MailCheck className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
            )
          ) : (
            <XCircle className="h-12 w-12 text-rose-500" strokeWidth={1.5} />
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-brand">{heading}</p>
        <h1 className="mt-1 text-xl font-bold text-asta-navy">
          {state === 'loading'
            ? 'İşleniyor…'
            : state === 'success'
              ? isConfirm
                ? 'Aboneliğin onaylandı'
                : 'Aboneliğin iptal edildi'
              : 'Bir sorun oluştu'}
        </h1>

        {state !== 'loading' ? (
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{message}</p>
        ) : null}

        {state !== 'loading' ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              to="/urunler"
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
            >
              Ürünleri keşfet
            </Link>
            <Link to="/" className="text-sm font-semibold text-neutral-600 hover:text-asta-navy">
              Ana sayfaya dön
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
