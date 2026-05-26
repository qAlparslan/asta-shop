import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Image,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { inputClass } from '../../lib/formStyles.js';

import HeroTrustCardsEditor from './HeroTrustCardsEditor.jsx';

/** @typedef {{ id: string; sortOrder?: number; title: string; subtitle: string; ctaText: string; ctaUrl: string; bgType: string; bgGradient?: string|null; bgImageUrl?: string|null; imageAlt?: string|null; isActive: boolean }} SlideRow */

const emptyDraft = () => ({
  title: '',
  subtitle: '',
  ctaText: 'İncele',
  ctaUrl: '/urunler',
  bgType: 'gradient',
  bgGradient:
    'linear-gradient(135deg, rgb(245 247 251) 0%, rgb(230 237 246) 45%, rgb(221 229 239) 100%)',
  bgImageUrl: '',
  imageAlt: '',
  isActive: true,
});

function thumbPreview(slide) {
  if (slide.bgType === 'image' && slide.bgImageUrl) {
    return (
      <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <img
          src={slide.bgImageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="h-14 w-24 shrink-0 rounded-lg border border-neutral-200"
      style={{ background: slide.bgGradient || '#e5e7eb' }}
    />
  );
}

/**
 * Slaytın vitrinde sağda görünen 16:9 görsel alanı — yalnızca slayt formunda kullanılır.
 */
function HeroSlideVisualAside({ slide, onSlideChange, uploadDisabled, onUploadFile }) {
  const previewGradient =
    slide.bgGradient?.trim() ||
    'linear-gradient(135deg, rgb(245 247 251) 0%, rgb(230 237 246) 50%, rgb(221 229 239) 100%)';

  return (
    <aside className="w-full shrink-0 lg:max-w-[420px] lg:pt-1">
      <div className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-4 shadow-sm sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Sağ vitrin</p>
        <p className="mt-1 text-base font-semibold text-asta-navy">Slayt görseli (16:9)</p>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">
          Müşteri tarafında metin solda, bu blok sağda büyük görünür. PNG veya JPG yükleyin veya gradient tanımlayın.
        </p>

        <label className="mt-5 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
          Görünüm türü
        </label>
        <select
          className={`mt-2 w-full ${inputClass} py-2.5`}
          value={slide.bgType === 'image' ? 'image' : 'gradient'}
          onChange={(ev) =>
            onSlideChange({ bgType: ev.target.value === 'image' ? 'image' : 'gradient' })
          }
        >
          <option value="gradient">Gradient arka plan</option>
          <option value="image">Görsel (PNG/JPG/WebP/GIF)</option>
        </select>

        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900/5">
          {slide.bgType === 'image' && slide.bgImageUrl?.trim() ? (
            <img
              src={slide.bgImageUrl.trim()}
              alt={slide.imageAlt?.trim() || 'Hero önizleme'}
              className="aspect-video w-full object-cover object-center"
            />
          ) : (
            <div
              className="aspect-video w-full min-h-[160px]"
              style={{ background: previewGradient }}
            />
          )}
        </div>

        {slide.bgType === 'gradient' ? (
          <div className="mt-4">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              CSS gradient
            </label>
            <textarea
              rows={3}
              className={`mt-2 font-mono text-xs ${inputClass}`}
              value={slide.bgGradient ?? ''}
              onChange={(ev) => onSlideChange({ bgGradient: ev.target.value })}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Görsel adresi (yükleme sonrası dolar)
              </label>
              <input
                className={`mt-2 ${inputClass}`}
                value={slide.bgImageUrl ?? ''}
                onChange={(ev) => onSlideChange({ bgImageUrl: ev.target.value })}
                placeholder="/uploads/home-hero/…"
              />
            </div>
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-400 bg-white px-4 py-3 text-sm font-semibold text-asta-navy shadow-sm hover:bg-neutral-50 disabled:opacity-50">
                <Image className="h-5 w-5 text-brand" aria-hidden />
                PNG / JPG / WebP yükle
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                  className="sr-only"
                  disabled={uploadDisabled}
                  onChange={async (ev) => {
                    const f = ev.target.files?.[0];
                    ev.target.value = '';
                    if (!f) return;
                    try {
                      const path = await onUploadFile(f);
                      onSlideChange({ bgImageUrl: path, bgType: 'image' });
                    } catch {
                      /* hata ayarlayıcıda gösterilir */
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Görsel alt metni (erişilebilirlik)
              </label>
              <input
                className={`mt-2 ${inputClass}`}
                value={slide.imageAlt ?? ''}
                onChange={(ev) => onSlideChange({ imageAlt: ev.target.value })}
                maxLength={500}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function AdminHeroPanel() {
  /** @type {[SlideRow[], function]} */
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');

  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  /** @type {SlideRow | null} */
  const [editor, setEditor] = useState(null);
  /** @type {SlideRow | null} */
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await apiFetch('/api/home-hero/manage');
      const list = Array.isArray(res?.data?.slides) ? res.data.slides : [];
      setSlides(list);
    } catch (e) {
      setErr(typeof e.message === 'string' ? e.message : 'Hero slaytları yüklenemedi.');
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () => [...slides].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [slides],
  );

  const anyBusy = !!busyId;

  const reorder = async (orderedIds) => {
    setBusyId('reorder');
    setErr('');
    try {
      await apiFetch('/api/home-hero/reorder', { method: 'PUT', body: { orderedIds } });
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Sıra güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const move = async (idx, dir) => {
    const ids = sorted.map((s) => s.id);
    const j = idx + (dir === 'up' ? -1 : 1);
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[idx], next[j]] = [next[j], next[idx]];
    await reorder(next);
  };

  const toggleActive = async (slide, next) => {
    setBusyId(slide.id);
    setErr('');
    try {
      await apiFetch(`/api/home-hero/${slide.id}`, {
        method: 'PUT',
        body: { isActive: next },
      });
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Durum güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const uploadBg = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiFetch('/api/home-hero/upload-bg', { method: 'POST', body: fd });
    const p = res?.data?.path;
    if (!p || typeof p !== 'string') throw new Error('Yükleme yanıtı geçersiz.');
    return p;
  };

  const createSlide = async (e) => {
    e.preventDefault();
    const title = draft.title.trim();
    const subtitle = draft.subtitle.trim();
    const ctaText = draft.ctaText.trim();
    if (!title || !subtitle || !ctaText) {
      setErr('Başlık, açıklama ve düğme metni zorunludur.');
      return;
    }
    setCreating(true);
    setErr('');
    try {
      await apiFetch('/api/home-hero', {
        method: 'POST',
        body: {
          title,
          subtitle,
          ctaText,
          ctaUrl: draft.ctaUrl.trim() || '/urunler',
          bgType: draft.bgType === 'image' ? 'image' : 'gradient',
          bgGradient: draft.bgType === 'gradient' ? draft.bgGradient.trim() || null : null,
          bgImageUrl:
            draft.bgType === 'image' && draft.bgImageUrl.trim() ? draft.bgImageUrl.trim() : null,
          imageAlt:
            draft.bgType === 'image' && draft.imageAlt.trim() ? draft.imageAlt.trim() : null,
          isActive: !!draft.isActive,
        },
      });
      setDraft(emptyDraft());
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Slayt eklenemedi.');
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editor) return;
    const title = editor.title.trim();
    const subtitle = editor.subtitle.trim();
    const ctaText = editor.ctaText.trim();
    if (!title || !subtitle || !ctaText) return;
    setBusyId(editor.id);
    setErr('');
    try {
      await apiFetch(`/api/home-hero/${editor.id}`, {
        method: 'PUT',
        body: {
          title,
          subtitle,
          ctaText,
          ctaUrl: editor.ctaUrl.trim() || '/urunler',
          bgType: editor.bgType === 'image' ? 'image' : 'gradient',
          bgGradient: editor.bgType === 'gradient' ? editor.bgGradient?.trim() || null : null,
          bgImageUrl:
            editor.bgType === 'image' && editor.bgImageUrl?.trim()
              ? editor.bgImageUrl.trim()
              : null,
          imageAlt:
            editor.bgType === 'image' && editor.imageAlt?.trim()
              ? editor.imageAlt.trim()
              : null,
          isActive: !!editor.isActive,
        },
      });
      setEditor(null);
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Kaydedilemedi.');
    } finally {
      setBusyId('');
    }
  };

  const doDelete = async (slide) => {
    setBusyId(slide.id);
    setErr('');
    try {
      await apiFetch(`/api/home-hero/${slide.id}`, { method: 'DELETE' });
      setConfirmDel(null);
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Silinemedi.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <HeroTrustCardsEditor embedded />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Hero — anasayfa vitrin
              </p>
              <h3 className="mt-1 text-lg font-semibold text-asta-navy">Yeni hero slaytı</h3>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Solda metin ve buton; sağda müşterinin gördüğü büyük görsel alanı ayrı panelden yönetirsiniz.
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold tabular-nums text-asta-navy">
              {sorted.length} slayt
            </span>
          </div>

          <form onSubmit={createSlide} className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Başlık
                  </label>
                  <input
                    className={`mt-2 ${inputClass}`}
                    value={draft.title}
                    onChange={(ev) => setDraft((d) => ({ ...d, title: ev.target.value }))}
                    placeholder="Hero başlığı"
                    maxLength={200}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  className={`mt-2 ${inputClass}`}
                  value={draft.subtitle}
                  onChange={(ev) => setDraft((d) => ({ ...d, subtitle: ev.target.value }))}
                  required
                  maxLength={500}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Düğme metni
                  </label>
                  <input
                    className={`mt-2 ${inputClass}`}
                    value={draft.ctaText}
                    onChange={(ev) => setDraft((d) => ({ ...d, ctaText: ev.target.value }))}
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Bağlantı (yol veya tam URL)
                  </label>
                  <input
                    className={`mt-2 ${inputClass}`}
                    value={draft.ctaUrl}
                    onChange={(ev) => setDraft((d) => ({ ...d, ctaUrl: ev.target.value }))}
                    placeholder="/urunler veya https://…"
                    maxLength={500}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(ev) => setDraft((d) => ({ ...d, isActive: ev.target.checked }))}
                  className="h-4 w-4 rounded border-neutral-300 text-brand"
                />
                Yayında göster
              </label>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={creating || anyBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover disabled:bg-neutral-400"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {creating ? 'Ekleniyor…' : 'Slayt ekle'}
                </button>
              </div>
            </div>

            <HeroSlideVisualAside
              slide={draft}
              onSlideChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              uploadDisabled={creating || busyId === 'upload'}
              onUploadFile={async (file) => {
                setErr('');
                setBusyId('upload');
                try {
                  return await uploadBg(file);
                } catch (ex) {
                  setErr(typeof ex.message === 'string' ? ex.message : 'Görsel yüklenemedi.');
                  throw ex;
                } finally {
                  setBusyId('');
                }
              }}
            />
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 p-5">
          <h3 className="text-lg font-semibold text-asta-navy">Hero slaytları</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Pasife alınanlar sitede gösterilmez; listede düzenlemeye devam edebilirsiniz.
          </p>
        </div>
        <div className="p-5">
          {err ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {err}
            </div>
          ) : null}
          {loading ? (
            <p className="text-sm text-neutral-500">Yükleniyor…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="pb-3 pr-3">Sıra</th>
                    <th className="pb-3 pr-3">Önizleme</th>
                    <th className="pb-3 pr-3">Başlık</th>
                    <th className="pb-3 pr-3">Aktif</th>
                    <th className="pb-3">İşlem</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-800">
                  {sorted.map((slide, idx) => (
                    <tr key={slide.id} className="border-b border-neutral-100 last:border-0">
                      <td className="align-middle py-3 pr-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={anyBusy || idx === 0}
                            onClick={() => move(idx, 'up')}
                            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-asta-navy disabled:opacity-40"
                            aria-label="Yukarı"
                          >
                            <ArrowUp className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled={anyBusy || idx === sorted.length - 1}
                            onClick={() => move(idx, 'down')}
                            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-asta-navy disabled:opacity-40"
                            aria-label="Aşağı"
                          >
                            <ArrowDown className="h-4 w-4" aria-hidden />
                          </button>
                          <span className="ml-1 tabular-nums text-xs text-neutral-400">{idx + 1}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-middle">{thumbPreview(slide)}</td>
                      <td className="max-w-xs py-3 pr-3 align-middle">
                        <span className="line-clamp-2 font-semibold text-asta-navy">{slide.title}</span>
                        {slide.subtitle ? (
                          <span className="mt-1 line-clamp-2 block text-xs text-neutral-500">
                            {slide.subtitle}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 align-middle">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!slide.isActive}
                          disabled={busyId === slide.id}
                          onClick={() => toggleActive(slide, !slide.isActive)}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${slide.isActive ? 'bg-brand' : 'bg-neutral-300'} disabled:opacity-60`}
                        >
                          <span
                            className={`inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform ${slide.isActive ? 'translate-x-6' : ''}`}
                          />
                        </button>
                      </td>
                      <td className="py-3 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditor({
                                ...slide,
                                bgGradient: slide.bgGradient ?? '',
                                bgImageUrl: slide.bgImageUrl ?? '',
                                imageAlt: slide.imageAlt ?? '',
                              })
                            }
                            disabled={anyBusy}
                            className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:border-brand/30 hover:text-brand disabled:opacity-40"
                            aria-label="Düzenle"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDel(slide)}
                            disabled={anyBusy}
                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-40"
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-neutral-500">
                        Henüz hero slaytı yok. Yukarıdan yeni kart ekleyin.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {editor ? (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal
          aria-labelledby="hero-edit-title"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl lg:p-8">
            <h4 id="hero-edit-title" className="text-lg font-semibold text-asta-navy">
              Hero slaytını düzenle
            </h4>
            <form onSubmit={saveEdit} className="mt-6 space-y-8">
              <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-neutral-500">Başlık</label>
                    <input
                      className={`mt-2 ${inputClass}`}
                      value={editor.title}
                      onChange={(ev) => setEditor({ ...editor, title: ev.target.value })}
                      maxLength={200}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-neutral-500">Açıklama</label>
                    <textarea
                      rows={3}
                      className={`mt-2 ${inputClass}`}
                      value={editor.subtitle}
                      onChange={(ev) => setEditor({ ...editor, subtitle: ev.target.value })}
                      maxLength={500}
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-neutral-500">Düğme</label>
                      <input
                        className={`mt-2 ${inputClass}`}
                        value={editor.ctaText}
                        onChange={(ev) => setEditor({ ...editor, ctaText: ev.target.value })}
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-neutral-500">Bağlantı</label>
                      <input
                        className={`mt-2 ${inputClass}`}
                        value={editor.ctaUrl}
                        onChange={(ev) => setEditor({ ...editor, ctaUrl: ev.target.value })}
                        maxLength={500}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!editor.isActive}
                      onChange={(ev) => setEditor({ ...editor, isActive: ev.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300 text-brand"
                    />
                    Yayında
                  </label>
                </div>

                <HeroSlideVisualAside
                  slide={editor}
                  onSlideChange={(patch) => editor && setEditor({ ...editor, ...patch })}
                  uploadDisabled={busyId === 'upload-edit' || busyId === editor.id}
                  onUploadFile={async (file) => {
                    setErr('');
                    setBusyId('upload-edit');
                    try {
                      return await uploadBg(file);
                    } catch (ex) {
                      setErr(typeof ex.message === 'string' ? ex.message : 'Görsel yüklenemedi.');
                      throw ex;
                    } finally {
                      setBusyId('');
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-3 border-t border-neutral-100 pt-6">
                <button
                  type="button"
                  className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  onClick={() => setEditor(null)}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={busyId === editor.id || busyId === 'upload-edit'}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover disabled:bg-neutral-400 lg:flex-none lg:min-w-[180px]"
                >
                  <Save className="h-4 w-4" aria-hidden />
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirmDel ? (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="alertdialog"
          aria-modal
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <h4 className="font-semibold text-asta-navy">Slayt silinsin mi?</h4>
            <p className="mt-2 text-sm text-neutral-600">
              <strong>{confirmDel.title}</strong> kalıcı olarak silinecek.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                onClick={() => setConfirmDel(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-red-700 disabled:bg-neutral-400"
                onClick={() => doDelete(confirmDel)}
                disabled={busyId === confirmDel.id}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
