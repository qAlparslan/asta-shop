import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { inputClass } from '../../lib/formStyles.js';
import { LEGAL_DOCUMENT_LINKS, legalDocHref } from '../../lib/legalDocLinks.js';

/** @typedef {{ heading: string; paragraphs: string[] }} LegalSectionDraft */

const DOC_ORDER = LEGAL_DOCUMENT_LINKS.map(({ slug, label }) => ({
  slug,
  label,
  hint: legalDocHref(slug),
}));

/** @param {string[]} paras */
function parasToArea(paras) {
  return Array.isArray(paras) ? paras.join('\n\n') : '';
}

/** @param {string} text */
function areaToParas(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  const parts = t.split(/\n\s*\n/);
  return parts.map((p) => String(p || '').trim()).filter(Boolean);
}

/**
 * Sunucunun döndürdüğü sayfayı yalın editor state'ine çevirür.
 * @param {Record<string, any>} mergedPages
 */
function pagesFromApi(mergedPages) {
  /** @type {Record<string, { title: string; version: string; summary: string; sections: LegalSectionDraft[] }>} */
  const out = {};
  for (const { slug } of DOC_ORDER) {
    const raw = mergedPages[slug];
    if (!raw) continue;
    out[slug] = {
      title: String(raw.title || ''),
      version: String(raw.version || ''),
      summary: String(raw.summary || ''),
      sections: Array.isArray(raw.sections)
        ? raw.sections.map((s) => ({
            heading: typeof s?.heading === 'string' ? s.heading : '',
            paragraphs: Array.isArray(s?.paragraphs) ? s.paragraphs.map((p) => String(p ?? '')) : [],
          }))
        : [],
    };
  }
  return out;
}


/** @param {Record<string, { title: string; version: string; summary: string; sections: LegalSectionDraft[] }>} pagesDraft */
function buildPayload(pagesDraft) {
  /** @type {Record<string, { title: string; version: string; summary: string; sections: { heading: string; paragraphs: string[] }[] }>} */
  const pages = {};
  for (const { slug } of DOC_ORDER) {
    const d = pagesDraft[slug];
    if (!d) throw new Error('Eksik belge taslağı.');
    pages[slug] = {
      title: d.title.trim(),
      version: d.version.trim(),
      summary: d.summary.trim(),
      sections: (d.sections || []).map((sec) => ({
        heading: sec.heading.trim(),
        paragraphs: Array.isArray(sec.paragraphs) ? sec.paragraphs.map((p) => String(p || '').trim()) : [],
      })),
    };
  }
  return { pages };
}

export default function AdminLegalDocumentsPanel() {
  const [loading, setLoading] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  /** @type {Record<string, any>} */
  const [draft, setDraft] = useState({});
  const [activeSlug, setActiveSlug] = useState(DOC_ORDER[0].slug);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await apiFetch('/api/legal/admin/bundle');
      const merged = res?.data?.pages || {};
      const next = pagesFromApi(merged);
      setDraft(next);
      setMsg('');
    } catch (e) {
      setErr(typeof e.message === 'string' ? e.message : 'Yasal metinler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeMeta = useMemo(
    () => DOC_ORDER.find((d) => d.slug === activeSlug) || DOC_ORDER[0],
    [activeSlug],
  );

  const doc = draft[activeSlug];

  const updateDoc = useCallback(
    (slug, patch) => {
      setDraft((prev) => ({
        ...prev,
        [slug]: { ...prev[slug], ...patch },
      }));
    },
    [],
  );

  const updateSection = useCallback((slug, index, patch) => {
    setDraft((prev) => {
      const d = prev[slug];
      if (!d) return prev;
      const sections = [...(d.sections || [])];
      sections[index] = { ...sections[index], ...patch };
      return { ...prev, [slug]: { ...d, sections } };
    });
  }, []);

  const addSection = useCallback((slug) => {
    setDraft((prev) => {
      const d = prev[slug];
      if (!d) return prev;
      const sections = [...(d.sections || []), { heading: 'Yeni bölüm', paragraphs: [''] }];
      return { ...prev, [slug]: { ...d, sections } };
    });
  }, []);

  const removeSection = useCallback((slug, index) => {
    setDraft((prev) => {
      const d = prev[slug];
      if (!d) return prev;
      const sections = (d.sections || []).filter((_, i) => i !== index);
      return { ...prev, [slug]: { ...d, sections } };
    });
  }, []);

  const saveAll = async (e) => {
    e.preventDefault();
    setSaveBusy(true);
    setErr('');
    setMsg('');
    try {
      const payload = buildPayload(draft);
      await apiFetch('/api/legal/admin/bundle', {
        method: 'PUT',
        body: payload,
      });
      setMsg(
        'Tüm yasal metinler kaydedildi. Sürüm kodlarını değiştirdiyseniz ziyaretçilerin sayfayı yenilemesi gerekir.',
      );
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Kayıt başarısız.');
    } finally {
      setSaveBusy(false);
    }
  };

  const versionHint =
    'Sürüm kodu (örn. 2026-05-23) kutucuk onayları ve checkout ile karşılaştırılır. Metni güncellediğinizde artırın.';

  return (
    <form onSubmit={saveAll} className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Önemli:</strong> Buradaki metinler mağaza yasal sayfalarına, kayıt/çerez onayına ve sipariş
        özeti doğrulamasına yansır. Tüm dokümanlar tek kayıtta güncellenir; kaydetmeden çıkmayın veya yeniden yüklemeyin.
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{err}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {msg}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Sunucudan güncel metinler çekiliyor…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {DOC_ORDER.map((d) => (
              <button
                key={d.slug}
                type="button"
                onClick={() => setActiveSlug(d.slug)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${activeSlug === d.slug ? 'bg-brand text-white shadow' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {doc ? (
            <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold text-asta-navy">{activeMeta.label}</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Ön yüz yolu <span className="font-mono">{activeMeta.hint}</span>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Sayfa başlığı
                  </label>
                  <input
                    className={`mt-2 ${inputClass}`}
                    value={doc.title}
                    onChange={(e) => updateDoc(activeSlug, { title: e.target.value })}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Sürüm kodu
                  </label>
                  <input
                    className={`mt-2 font-mono text-sm ${inputClass}`}
                    value={doc.version}
                    onChange={(e) => updateDoc(activeSlug, { version: e.target.value })}
                    maxLength={40}
                  />
                  <p className="mt-1 text-xs text-neutral-500">{versionHint}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Kısa özet (liste / sürüm API’si)
                  </label>
                  <textarea
                    rows={3}
                    className={`mt-2 ${inputClass}`}
                    value={doc.summary}
                    onChange={(e) => updateDoc(activeSlug, { summary: e.target.value })}
                    maxLength={1000}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-neutral-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
                    İçerik bölümleri
                  </h4>
                  <button
                    type="button"
                    onClick={() => addSection(activeSlug)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-muted bg-brand-muted/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand hover:bg-brand/10"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    Bölüm ekle
                  </button>
                </div>

                {(doc.sections || []).map((sec, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-neutral-100 bg-neutral-50/80 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <label className="text-[11px] font-bold uppercase text-neutral-500">Bölüm başlığı</label>
                        <input
                          className={`mt-1.5 ${inputClass}`}
                          value={sec.heading}
                          onChange={(e) => updateSection(activeSlug, idx, { heading: e.target.value })}
                          maxLength={400}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label={`Bölüm ${idx + 1} sil`}
                        onClick={() => removeSection(activeSlug, idx)}
                        className="mt-7 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-neutral-500">
                        Paragraflar (paragraflar arasında boş satır bırakın)
                      </label>
                      <textarea
                        rows={8}
                        className={`mt-1.5 font-sans ${inputClass}`}
                        value={parasToArea(sec.paragraphs)}
                        onChange={(e) =>
                          updateSection(activeSlug, idx, { paragraphs: areaToParas(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">Seçilen belge yüklenemedi.</p>
          )}
        </>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => load()}
          disabled={loading || saveBusy}
          className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Sunucudan yenile
        </button>
        <button
          type="submit"
          disabled={loading || saveBusy}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-brand-hover disabled:bg-neutral-400"
        >
          <Save className="h-4 w-4" strokeWidth={2} />
          {saveBusy ? 'Kaydediliyor…' : 'Tüm yasal metinleri kaydet'}
        </button>
      </div>
    </form>
  );
}
