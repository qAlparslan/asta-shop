import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { apiFetch, isAbortError } from '../api/client.js';

export default function LegalDocumentPage() {
  const { slug } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    setError('');
    setDoc(null);
    apiFetch(`/api/legal/content/${encodeURIComponent(slug || '')}`, { skipAuth: true, signal: ac.signal })
      .then((res) => {
        const d = res?.data;
        if (!d?.title || !Array.isArray(d.sections)) throw new Error('Geçersiz yanıt.');
        setDoc(d);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setError(err?.message || 'Metin yüklenemedi.');
      });
    return () => ac.abort();
  }, [slug]);

  return (
    <article className="border-b border-neutral-200 bg-neutral-50/80 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Ana sayfa
        </Link>

        {!error && !doc && (
          <p className="mt-10 text-sm text-neutral-500" role="status">
            Yükleniyor…
          </p>
        )}

        {error && (
          <div className="mt-10 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}{' '}
            <Link to="/iletisim" className="font-semibold underline">
              İletişim
            </Link>
          </div>
        )}

        {doc && (
          <>
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <FileText className="mt-0.5 h-8 w-8 shrink-0 text-brand" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand">Yasal metin</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{doc.title}</h1>
                <p className="mt-2 text-xs text-neutral-500">
                  Sürüm: <span className="font-mono">{doc.version}</span>
                </p>
              </div>
            </div>

            <div className="mt-10 space-y-10 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
              {doc.sections.map((sec, i) => (
                <section key={sec.heading || i}>
                  <h2 className="text-lg font-bold text-asta-navy">{sec.heading}</h2>
                  <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-700">
                    {(sec.paragraphs || []).map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-8 text-xs leading-relaxed text-neutral-500">
              Bu metinler genel bilgilendirme amaçlıdır; işlemin niteliğine göre ek şartlar ve mevzuat hükümleri
              uygulanır. Sorularınız için{' '}
              <Link to="/iletisim" className="font-semibold text-brand hover:text-brand-hover">
                iletişim
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </article>
  );
}
