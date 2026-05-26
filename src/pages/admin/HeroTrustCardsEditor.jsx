import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { inputClass } from '../../lib/formStyles.js';
import {
  ICON_MAP,
  TRUST_CARD_PRESETS,
  DEFAULT_HERO_TRUST_CARDS,
  parseHeroTrustCardsSetting,
  getTrustPresetByKey,
} from '../../lib/heroTrustCards.js';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneDefaults() {
  return DEFAULT_HERO_TRUST_CARDS.map((c) => ({ ...c, id: newId() }));
}

function PresetThumbnail({ presetKey }) {
  const p = getTrustPresetByKey(presetKey);
  const Icon = ICON_MAP[p.iconKey] || ICON_MAP.shield;
  return (
    <div
      className={`flex h-14 w-full flex-col items-center justify-center rounded-lg px-2 py-2 ${p.cardClassName}`}
    >
      <Icon className={p.iconClassName} strokeWidth={1.75} aria-hidden />
    </div>
  );
}

/**
 * Güven kartları: yalnızca şablon + başlık; hero slayt oluşturma ile aynı sayfada.
 */
export default function HeroTrustCardsEditor({ embedded: _embedded }) {
  const [cards, setCards] = useState(() => cloneDefaults());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/settings', { skipAuth: true });
      const raw = res?.data?.settings?.heroTrustCards;
      const parsed = parseHeroTrustCardsSetting(raw);
      if (parsed) setCards(parsed);
      else setCards(cloneDefaults());
    } catch (e) {
      setError(typeof e.message === 'string' ? e.message : 'Ayarlar yüklenemedi.');
      setCards(cloneDefaults());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async () => {
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: { settings: { heroTrustCards: JSON.stringify(cards) } },
      });
      setMsg('Güven kartları kaydedildi.');
      await load();
    } catch (ex) {
      setError(typeof ex.message === 'string' ? ex.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const move = (idx, dir) => {
    setCards((prev) => {
      const j = idx + (dir === 'up' ? -1 : 1);
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const removeAt = (idx) => {
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveEditor = (e) => {
    e.preventDefault();
    if (!editor) return;
    const title = editor.title.trim();
    if (!title || title.length > 200) {
      setError('Başlık zorunludur.');
      return;
    }
    if (!editor.presetKey) {
      setError('Bir kart şablonu seçin.');
      return;
    }
    const next = { ...editor, title, presetKey: editor.presetKey };
    setCards((prev) => {
      const i = prev.findIndex((c) => c.id === next.id);
      if (i >= 0) {
        const cp = [...prev];
        cp[i] = next;
        return cp;
      }
      return prev.length < 4 ? [...prev, next] : prev;
    });
    setEditor(null);
    setError('');
  };

  const wrapClass = _embedded
    ? ''
    : 'rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7';

  return (
    <div className={wrapClass || undefined}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-asta-navy">
            <LayoutGrid className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-asta-navy">Hero güven kartları</h3>
            <p className="mt-1 max-w-xl text-sm text-neutral-600">
              Slaytların altındaki dörtlü güven kutularını yönetin (en fazla 4). Yalnızca{' '}
              <strong>kart görünümü</strong> ve <strong>başlık</strong> girilir; görsel yükleme yoktur — büyük
              vitrin görseli slayt sağ kolonundan yüklenir.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (cards.length >= 4) return;
              setEditor({
                id: newId(),
                presetKey: 'shield-soft',
                title: '',
              });
            }}
            disabled={cards.length >= 4 || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-asta-navy hover:bg-neutral-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Güven kartı ekle
          </button>
          <button
            type="button"
            onClick={() => persist()}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover disabled:bg-neutral-400"
          >
            <Save className="h-4 w-4" aria-hidden />
            {saving ? 'Kaydediliyor…' : 'Güven kartlarını kaydet'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {msg}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-neutral-500">Yükleniyor…</p>
        ) : (
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="pb-3 pr-3">Sıra</th>
                <th className="pb-3 pr-3">Şablon</th>
                <th className="pb-3 pr-3">Başlık</th>
                <th className="pb-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {cards.map((c, idx) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => move(idx, 'up')}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                        aria-label="Yukarı"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={idx === cards.length - 1}
                        onClick={() => move(idx, 'down')}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                        aria-label="Aşağı"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                  <td className="w-44 py-3 pr-3 align-middle">
                    <PresetThumbnail presetKey={c.presetKey} />
                    <span className="mt-1 line-clamp-2 block text-[10px] text-neutral-500">
                      {getTrustPresetByKey(c.presetKey).label}
                    </span>
                  </td>
                  <td className="max-w-sm py-3 pr-3 align-middle font-medium text-asta-navy">{c.title}</td>
                  <td className="py-3 align-middle">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditor({ ...c })}
                        className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:border-brand/30 hover:text-brand"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-neutral-500">
                    Henüz kart yok — vitrin şimdilik öntanımlı kartları gösterir.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {editor ? (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal
          aria-labelledby="htc-edit-title"
        >
          <form
            onSubmit={saveEditor}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
          >
            <h4 id="htc-edit-title" className="text-lg font-semibold text-asta-navy">
              {cards.some((x) => x.id === editor.id) ? 'Güven kartı' : 'Yeni güven kartı'}
            </h4>
            <label className="mt-6 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Başlık
            </label>
            <input
              className={`mt-2 ${inputClass}`}
              value={editor.title}
              onChange={(ev) => setEditor({ ...editor, title: ev.target.value })}
              placeholder="Örn. %100 Orijinal ürün"
              maxLength={200}
              required
            />

            <p className="mt-6 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Kart şablonu <span className="font-normal text-neutral-400">— önizlemeden seçin</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TRUST_CARD_PRESETS.map((preset) => {
                const Icon = ICON_MAP[preset.iconKey];
                const selected = editor.presetKey === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setEditor({ ...editor, presetKey: preset.key })}
                    className={`rounded-xl border bg-white p-2 text-left transition-shadow ${
                      selected
                        ? 'border-brand shadow-md ring-2 ring-brand/30'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div
                      className={`flex min-h-[3.75rem] items-center justify-center rounded-lg ${preset.cardClassName}`}
                    >
                      <Icon className={preset.iconClassName} strokeWidth={1.75} aria-hidden />
                    </div>
                    <span className="mt-1 block text-[10px] font-medium leading-tight text-neutral-600">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                onClick={() => setEditor(null)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover"
              >
                Tamam
              </button>
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              Listeyi kaydetmek için şablondaki <strong>Güven kartlarını kaydet</strong> düğmesini kullanın.
            </p>
          </form>
        </div>
      ) : null}
    </div>
  );
}
