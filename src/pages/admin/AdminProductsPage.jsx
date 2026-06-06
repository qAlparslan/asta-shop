import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  AlertTriangle,
  CloudUpload,
  FilePlus2,
  Globe,
  GripVertical,
  Package,
  Pencil,
  Percent,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { mediaUrl } from '../../lib/mediaUrl.js';
import { pickProductImagePath } from '../../lib/productMap.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { inputClass } from '../../lib/formStyles.js';

const CSV_TEMPLATE_BOM =
  '\uFEFFÜrün Adı,Ürün Açıklaması,Piyasa Satış Fiyatı (KDV Dahil),Ürün Stok Adedi,Marka,Kategori\n';

const SKIN_TYPE_OPTIONS = [
  { value: 'tumu', label: 'Tüm cilt tipleri' },
  { value: 'hassas', label: 'Hassas' },
  { value: 'kuru', label: 'Kuru' },
  { value: 'yagli_karma', label: 'Yağlı / karma' },
  { value: 'olgun', label: 'Olgun cilt' },
];

const TAG_PRESETS = [
  { value: 'yok', label: 'Yok' },
  { value: 'yeni', label: 'Yeni' },
  { value: 'cok-satan', label: 'Çok satan' },
  { value: 'kampanya', label: 'Kampanya' },
];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

const quillFormats = ['header', 'bold', 'italic', 'underline', 'color', 'background', 'list', 'bullet'];

function downloadCsvTemplate() {
  const row =
    'Örnek Ürün,"Kısa açıklama metni (zorunlu).",199.90,50,ASTA TİCARET,Serum\n';
  const blob = new Blob([CSV_TEMPLATE_BOM + row], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'urun-sablonu.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** `<input type="datetime-local" />` değerini ISO UTC stringe çevirir. */
function localDatetimeToUtcIso(datetimeLocalStr) {
  const s = String(datetimeLocalStr ?? '').trim();
  if (!s) return null;
  const [datePart, timePartRaw] = s.split('T');
  if (!datePart) return null;
  const parts = datePart.split('-').map((x) => parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const timePart = String(timePartRaw || '00:00');
  const [hhRaw, miRaw] = timePart.split(':');
  const hh = parseInt(String(hhRaw || '0'), 10);
  const mi = parseInt(String(miRaw || '0'), 10);
  const local = new Date(y, mo - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mi) ? mi : 0, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/** Sunucudan gelen tarih → datetime-local görünümü (tarayıcı yerel TZ). */
function dbIsoToDatetimeLocal(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** @param {string} s */
function parseDecimalInput(s) {
  const x = String(s || '').trim().replace(/\s/g, '').replace(',', '.');
  const n = Number.parseFloat(x);
  return Number.isFinite(n) ? n : NaN;
}

/** @param {unknown} img */
function imagePaths(img) {
  if (img == null) return [];
  let arr = img;
  if (typeof img === 'string') {
    try {
      arr = JSON.parse(img);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => typeof x === 'string' && x.trim());
}

/** @param {unknown} raw */
function normalizeVariants(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((v, i) => {
    const stableId =
      typeof v?.id === 'string' && v.id.trim()
        ? v.id.trim()
        : typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${i}`;
    return {
      uid: stableId,
      name: String(v?.name || '').trim() || `Seçenek ${i + 1}`,
      stock: Number.isFinite(Number(v?.stock)) ? Math.max(0, Math.round(Number(v.stock))) : 0,
      priceExtra: String(v?.priceExtra ?? '').trim(),
    };
  });
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [query, setQuery] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  /** @type {[null | 'discount' | 'stock' | 'markup' | 'tag', (v: null | 'discount' | 'stock' | 'markup' | 'tag') => void]} */
  const [bulkModal, setBulkModal] = useState(null);
  const [bulkDiscPct, setBulkDiscPct] = useState('10');
  const [bulkDiscStart, setBulkDiscStart] = useState('');
  const [bulkDiscEnd, setBulkDiscEnd] = useState('');
  const [bulkStockVal, setBulkStockVal] = useState('0');
  const [bulkMarkupPct, setBulkMarkupPct] = useState('5');
  const [bulkTagVal, setBulkTagVal] = useState('kampanya');
  /** @type {null | Record<string, unknown>} */
  const [editorProduct, setEditorProduct] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const csvInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiFetch('/api/products/all-admin')
      .then((res) => setProducts(Array.isArray(res?.data?.products) ? res.data.products : []))
      .catch((e) => setError(e.message || 'Ürünler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        String(p.name || '')
          .toLowerCase()
          .includes(q) ||
        String(p.brand || '')
          .toLowerCase()
          .includes(q) ||
        String(p.category || '')
          .toLowerCase()
          .includes(q) ||
        String(p.barcode || '')
          .toLowerCase()
          .includes(q),
    );
  }, [products, query]);

  useEffect(() => {
    const allowed = new Set(visible.map((p) => p.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => allowed.has(id))));
  }, [visible]);

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selectedIds.has(p.id));

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (visible.length === 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds((prev) => {
      if (visible.every((p) => prev.has(p.id))) return new Set();
      return new Set(visible.map((p) => p.id));
    });
  };

  const runBulk = async (body, confirmMsg = null) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBulkBusy(true);
    setError('');
    try {
      await apiFetch('/api/products/bulk-action', {
        method: 'POST',
        body: { ...body, ids },
      });
      setSelectedIds(new Set());
      setBulkModal(null);
      await load();
    } catch (e) {
      setError(e.message || 'Toplu işlem başarısız.');
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkHide = () =>
    runBulk(
      { action: 'hide' },
      `${selectedIds.size} ürün vitrinden kaldırılsın mı? (Pasif; veri silinmez.)`,
    );

  const bulkShow = () => runBulk({ action: 'activate' }, null);

  const bulkRemoveDiscount = () =>
    runBulk(
      { action: 'remove_discount' },
      `Seçili ${selectedIds.size} üründe planlı indirim kaldırılıp liste fiyatına dönülsün mü?`,
    );

  const bulkPurge = () => {
    const n = selectedIds.size;
    if (
      !window.confirm(
        `${n} ürün arşivlenecek (silinmiş kayıt; admin listesinde görünmez). Devam edilsin mi?`,
      )
    )
      return;
    if (
      !window.confirm(
        'İkinci onay: Arşivlenmiş ürünleri tekrar göstermek için veritabanı işlemi gerekir. Emin misiniz?',
      )
    )
      return;
    runBulk({ action: 'purge' }, null);
  };

  const submitBulkDiscount = (e) => {
    e.preventDefault();
    const pct = parseInt(String(bulkDiscPct).trim(), 10);
    if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
      window.alert('İndirim oranı %1 ile %99 arasında olmalıdır.');
      return;
    }
    const startIso =
      bulkDiscStart.trim() === '' ? null : localDatetimeToUtcIso(bulkDiscStart.trim());
    if (bulkDiscStart.trim() !== '' && !startIso) {
      window.alert('Başlangıç tarih veya saati geçersiz.');
      return;
    }
    const endIso = bulkDiscEnd.trim() === '' ? null : localDatetimeToUtcIso(bulkDiscEnd.trim());
    if (bulkDiscEnd.trim() !== '' && !endIso) {
      window.alert('Bitiş tarih veya saati geçersiz.');
      return;
    }
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      window.alert('Bitiş zamanı başlangıçtan sonra olmalıdır.');
      return;
    }
    runBulk(
      {
        action: 'price_discount',
        value: pct,
        startDate: startIso,
        endDate: endIso,
      },
      `Seçili ${selectedIds.size} ürüne %${pct} indirim planı uygulansın mı? Başlangıç boşsa hemen; bitiş boşsa süre sınırı yok (elle kaldırın). Sunucu her dakika fiyatı günceller.`,
    );
  };

  const submitBulkStock = (e) => {
    e.preventDefault();
    const n = parseInt(String(bulkStockVal).trim(), 10);
    if (!Number.isFinite(n) || n < 0) {
      window.alert('Geçerli bir stok (0 veya üzeri) girin.');
      return;
    }
    runBulk(
      { action: 'stock', value: n },
      `Seçili ${selectedIds.size} ürünün stoğu ${n} olarak ayarlansın mı?`,
    );
  };

  const submitBulkMarkup = (e) => {
    e.preventDefault();
    const n = parseDecimalInput(bulkMarkupPct);
    if (!Number.isFinite(n) || n <= 0) {
      window.alert('Geçerli bir zam yüzdesi girin (ör. 10).');
      return;
    }
    runBulk(
      { action: 'price_increase', value: n },
      `Seçili ${selectedIds.size} ürünün fiyatına %${n} zam uygulanıp zamanlı indirim alanları temizlensin mi? Baz: mevcut liste fiyatı (original_price veya satış).`,
    );
  };

  const submitBulkTag = (e) => {
    e.preventDefault();
    const t = bulkTagVal.trim();
    if (!t) {
      window.alert('Bir etiket seçin veya yazın.');
      return;
    }
    runBulk(
      { action: 'tag', value: t },
      `Seçili ${selectedIds.size} ürüne "${t}" etiketi atanacak.`,
    );
  };

  const bulkDeactivate = bulkHide;

  const toggleActive = async (p) => {
    const next = !p.is_active;
    setBusyId(p.id);
    setError('');
    try {
      await apiFetch(`/api/products/${p.id}/visibility`, {
        method: 'PATCH',
        body: { is_active: next },
      });
      await load();
    } catch (e) {
      setError(e.message || 'Güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const onCsvSelected = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setImportBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch('/api/products/import', { method: 'POST', body: fd });
      window.alert(res?.message || 'İçe aktarma tamamlandı.');
      await load();
    } catch (e) {
      setError(e.message || 'CSV yüklenemedi.');
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-asta-navy">Ürün yönetimi</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Toplu seçim ile vitrin/indirim planı (% ve tarih-saat aralığı), stok, zam ve etiket; CSV ile içe aktarma;
          düzenleyicide SEO ve varyantlar.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:gap-4">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            strokeWidth={2}
            aria-hidden
          />
          <input
            type="search"
            placeholder="Ürün adı, marka, kategori veya barkod ile ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 outline-none ring-brand ring-offset-2 placeholder:text-neutral-400 focus:border-brand/50 focus:bg-white focus:ring-2"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-asta-navy shadow-sm hover:bg-neutral-50"
          >
            <FilePlus2 className="h-4 w-4 text-neutral-600" strokeWidth={1.75} />
            Şablon
          </button>
          <button
            type="button"
            disabled={importBusy}
            onClick={() => csvInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/25 bg-white px-4 py-2.5 text-sm font-semibold text-asta-navy shadow-sm hover:bg-brand-muted/50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4 text-brand" strokeWidth={1.75} />
            {importBusy ? 'Yükleniyor…' : 'CSV içe aktar'}
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onCsvSelected}
          />
          <button
            type="button"
            onClick={() => {
              setEditorProduct(null);
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Yeni ürün
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="space-y-3 rounded-xl border border-brand/20 bg-brand-muted/35 px-4 py-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-asta-navy">{selectedIds.size} ürün seçili</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                Planlı indirim: seçili kalemlerde <strong>liste fiyatı</strong> (mevcut orijinal ya da satış fiyatı)
                üzerinden yüzde uygulanır; başlangıç/bitis saatleriyle sınırlanır. Süre içinde backend her dakika fiyatı
                günceller.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Seçimi temizle
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkShow()}
              className="rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {bulkBusy ? '…' : 'Vitrine al'}
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkDeactivate()}
              className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Vitrinden gizle
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => {
                setBulkDiscPct('10');
                setBulkDiscStart('');
                setBulkDiscEnd('');
                setBulkModal('discount');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand hover:bg-brand-muted/60 disabled:opacity-50"
            >
              <Percent className="h-3.5 w-3.5" strokeWidth={2} />
              İndirim planla
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkRemoveDiscount()}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              İndirimi kaldır
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => {
                setBulkStockVal('0');
                setBulkModal('stock');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-asta-navy hover:bg-neutral-50 disabled:opacity-50"
            >
              <Package className="h-3.5 w-3.5" strokeWidth={2} />
              Stok
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => {
                setBulkMarkupPct('5');
                setBulkModal('markup');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-asta-navy hover:bg-neutral-50 disabled:opacity-50"
            >
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
              Zam %
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => {
                setBulkTagVal('kampanya');
                setBulkModal('tag');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-asta-navy hover:bg-neutral-50 disabled:opacity-50"
            >
              <TagIcon className="h-3.5 w-3.5" strokeWidth={2} />
              Etiket
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkPurge()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-400 bg-neutral-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-neutral-950 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Arşivle
            </button>
          </div>
        </div>
      )}

      {bulkModal === 'discount' ? (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="bulk-discount-title"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !bulkBusy) setBulkModal(null);
          }}
        >
          <form
            onSubmit={submitBulkDiscount}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 id="bulk-discount-title" className="text-lg font-semibold text-asta-navy">
              Toplu yüzde indirim planı
            </h3>
            <p className="mt-2 text-xs text-neutral-600">
              Liste fiyatı üzerinden uygulanır. Başlangıç boşsa hemen; bitiş boşsa süresizdir (topluca “İndirimi
              kaldır” ile sıfırlayın).
            </p>
            <label className="mt-5 block text-[11px] font-bold uppercase text-neutral-500">İndirim %</label>
            <input
              type="number"
              min={1}
              max={99}
              className={`mt-2 ${inputClass}`}
              value={bulkDiscPct}
              onChange={(e) => setBulkDiscPct(e.target.value)}
              required
            />
            <label className="mt-4 block text-[11px] font-bold uppercase text-neutral-500">Başlangıç (yerel)</label>
            <input
              type="datetime-local"
              className={`mt-2 ${inputClass}`}
              value={bulkDiscStart}
              onChange={(e) => setBulkDiscStart(e.target.value)}
            />
            <label className="mt-4 block text-[11px] font-bold uppercase text-neutral-500">Bitiş (yerel)</label>
            <input
              type="datetime-local"
              className={`mt-2 ${inputClass}`}
              value={bulkDiscEnd}
              onChange={(e) => setBulkDiscEnd(e.target.value)}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                onClick={() => setBulkModal(null)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={bulkBusy}
                className="inline-flex flex-1 min-w-[160px] items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover disabled:bg-neutral-400"
              >
                {bulkBusy ? 'Uygulanıyor…' : 'Uygula'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {bulkModal === 'stock' ? (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !bulkBusy) setBulkModal(null);
          }}
        >
          <form
            onSubmit={submitBulkStock}
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-asta-navy">Toplu stok</h3>
            <label className="mt-4 block text-[11px] font-bold uppercase text-neutral-500">Yeni stok miktarı</label>
            <input
              type="number"
              min={0}
              className={`mt-2 ${inputClass}`}
              value={bulkStockVal}
              onChange={(e) => setBulkStockVal(e.target.value)}
              required
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                onClick={() => setBulkModal(null)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={bulkBusy}
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover disabled:bg-neutral-400"
              >
                {bulkBusy ? '…' : 'Uygula'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {bulkModal === 'markup' ? (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !bulkBusy) setBulkModal(null);
          }}
        >
          <form
            onSubmit={submitBulkMarkup}
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-asta-navy">Toplu zam (%)</h3>
            <p className="mt-2 text-xs text-neutral-600">
              Baz fiyat olarak orijinal fiyatı (varsa) yoksa mevcut satış fiyatı kullanılır; planlı indirim alanları
              sıfırlanır.
            </p>
            <label className="mt-4 block text-[11px] font-bold uppercase text-neutral-500">Artış yüzdesi</label>
            <input
              type="text"
              inputMode="decimal"
              className={`mt-2 ${inputClass}`}
              value={bulkMarkupPct}
              onChange={(e) => setBulkMarkupPct(e.target.value)}
              required
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                onClick={() => setBulkModal(null)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={bulkBusy}
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover disabled:bg-neutral-400"
              >
                {bulkBusy ? '…' : 'Uygula'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {bulkModal === 'tag' ? (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !bulkBusy) setBulkModal(null);
          }}
        >
          <form
            onSubmit={submitBulkTag}
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-asta-navy">Toplu etiket</h3>
            <label className="mt-4 block text-[11px] font-bold uppercase text-neutral-500">Etiket</label>
            <select
              className={`mt-2 ${inputClass}`}
              value={TAG_PRESETS.some((o) => o.value === bulkTagVal) ? bulkTagVal : '__custom'}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__custom') setBulkTagVal('');
                else setBulkTagVal(v);
              }}
            >
              {TAG_PRESETS.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value="__custom">Özel…</option>
            </select>
            {!TAG_PRESETS.some((o) => o.value === bulkTagVal) ? (
              <input
                className={`mt-3 ${inputClass}`}
                placeholder="Özel etiket metni"
                value={bulkTagVal}
                onChange={(e) => setBulkTagVal(e.target.value)}
              />
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                onClick={() => setBulkModal(null)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={bulkBusy}
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover disabled:bg-neutral-400"
              >
                {bulkBusy ? '…' : 'Uygula'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full divide-y divide-neutral-100 text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="w-14 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => toggleSelectAllVisible()}
                    className="h-4 w-4 rounded border-neutral-300 accent-[#9f2133]"
                    aria-label="Tüm görünür satırları seç"
                  />
                </th>
                <th className="px-4 py-3.5 font-sans">Ürün</th>
                <th className="px-4 py-3.5 font-sans">Marka</th>
                <th className="px-4 py-3.5 font-sans">Kategori</th>
                <th className="px-4 py-3.5 font-sans">Fiyat</th>
                <th className="px-4 py-3.5 font-sans">Stok</th>
                <th className="px-4 py-3.5 font-sans">Sepet</th>
                <th className="px-4 py-3.5 font-sans">Barkod</th>
                <th className="px-4 py-3.5 text-right font-sans">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-500">
                    {query.trim() ? 'Aramaya uygun ürün yok.' : 'Ürün yok.'}
                  </td>
                </tr>
              )}
              {visible.map((p) => {
                const imgPath = pickProductImagePath(p.images);
                const src = imgPath ? mediaUrl(imgPath) : '';
                return (
                  <tr key={p.id} className="hover:bg-neutral-50/80">
                    <td className="px-4 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        className="h-4 w-4 rounded border-neutral-300 accent-[#9f2133]"
                        aria-label="Satır seç"
                      />
                    </td>
                    <td className="max-w-[240px] px-4 py-4">
                      <div className="flex gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50">
                          {src ? (
                            <img src={src} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 py-0.5">
                          <p className="line-clamp-2 font-semibold text-neutral-900">{p.name}</p>
                          <p className="mt-0.5 flex items-center gap-2">
                            <span
                              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                                p.is_active ? 'bg-emerald-500' : 'bg-neutral-300'
                              }`}
                            />
                            <span className="text-[11px] text-neutral-500">{p.is_active ? 'Vitrinde' : 'Pasif'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-neutral-800">{p.brand || '—'}</td>
                    <td className="max-w-[180px] px-4 py-4 text-neutral-700">
                      <span className="line-clamp-2">{p.category || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-brand">
                      <div className="flex flex-col items-start gap-0.5">
                        <span>{formatTRY(Number(p.price) || 0)}</span>
                        {Number(p.discountPercent) > 0 ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            Plan %{Number(p.discountPercent)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums text-neutral-800">{p.stock}</td>
                    <td className="min-w-[140px] px-4 py-4 text-xs leading-relaxed text-neutral-700">
                      <p>
                        <span className="font-semibold text-asta-navy">
                          {Math.max(0, Number(p.cartActiveHolderCount) || 0)}
                        </span>{' '}
                        kişinin sepetinde
                      </p>
                      <p className="mt-1 text-neutral-500">
                        {Math.max(0, Number(p.cartAddCount) || 0)} kez sepete eklendi
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-neutral-700">
                      {p.barcode ? p.barcode : <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditorProduct(p);
                            setEditorOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          Düzenle
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => toggleActive(p)}
                          className={`rounded-xl border px-2.5 py-2 text-xs font-semibold ${
                            p.is_active
                              ? 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                              : 'border-brand/35 bg-brand-muted text-brand hover:bg-brand-muted/80'
                          }`}
                        >
                          {p.is_active ? 'Gizle' : 'Göster'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editorOpen && (
        <ProductEditorOverlay
          key={`${editorProduct?.id ?? 'new'}-${editorOpen}`}
          mode={editorProduct ? 'edit' : 'create'}
          product={editorProduct}
          onClose={() => {
            setEditorOpen(false);
            setEditorProduct(null);
          }}
          onSaved={() => {
            setEditorOpen(false);
            setEditorProduct(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProductEditorOverlay({ mode, product, onClose, onSaved }) {
  const blobUrlsRef = useRef([]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
    },
    [],
  );

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [priceList, setPriceList] = useState('');
  const [priceDiscounted, setPriceDiscounted] = useState('');
  const [stock, setStock] = useState('0');
  const [skinType, setSkinType] = useState('tumu');
  const [tag, setTag] = useState('yok');
  const [slug, setSlug] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [barcode, setBarcode] = useState('');
  const [variants, setVariants] = useState([]);
  const [description, setDescription] = useState('');
  /** Planlı yüzde indirim (liste fiyatı üzerinden) — yüzde boş ise form bu alanı yok sayar */
  const [planPct, setPlanPct] = useState('');
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  /**
   * Tek sıralı görsel listesi. İlk eleman = kapak resmi.
   * @type {Array<{ id: string; kind: 'existing' | 'new'; url: string; file?: File }>}
   */
  const [images, setImages] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  /** @type {Array<{ id: string; name: string; slug: string }>} */
  const [categoriesList, setCategoriesList] = useState([]);
  const [categoriesErr, setCategoriesErr] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [seoBusy, setSeoBusy] = useState(false);

  useEffect(() => {
    if (!product) {
      setName('');
      setBrand('');
      setCategory('');
      setPriceList('');
      setPriceDiscounted('');
      setStock('0');
      setSkinType('tumu');
      setTag('yok');
      setSlug('');
      setMetaTitle('');
      setMetaDesc('');
      setBarcode('');
      setVariants([]);
      setDescription('');
      setPlanPct('');
      setPlanStart('');
      setPlanEnd('');
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
      setImages([]);
      setErr('');
      return;
    }
    const orig = Number(product.original_price);
    const pr = Number(product.price);
    setName(String(product.name || ''));
    setBrand(String(product.brand || ''));
    setCategory(String(product.category || ''));
    if (Number.isFinite(orig) && orig > 0 && Number.isFinite(pr) && pr < orig) {
      setPriceList(String(orig));
      setPriceDiscounted(String(pr));
    } else {
      setPriceList(Number.isFinite(pr) ? String(pr).replace('.', ',') : '');
      setPriceDiscounted('');
    }
    setStock(String(product.stock ?? 0));
    const st = typeof product.skin_type === 'string' ? product.skin_type.trim() : '';
    setSkinType(SKIN_TYPE_OPTIONS.some((o) => o.value === st) ? st : 'tumu');
    setTag(product.tag ? String(product.tag) : 'yok');
    setSlug(String(product.slug || ''));
    setMetaTitle(String(product.meta_title || ''));
    setMetaDesc(String(product.meta_description || ''));
    setBarcode(String(product.barcode || ''));
    setVariants(normalizeVariants(product.variants));
    const dp = Number(product.discountPercent);
    setPlanPct(Number.isFinite(dp) && dp > 0 ? String(dp) : '');
    setPlanStart(dbIsoToDatetimeLocal(product.discountStartsAt));
    setPlanEnd(dbIsoToDatetimeLocal(product.discountExpiresAt));
    setDescription(
      typeof product.description === 'string' && product.description.trim()
        ? product.description
        : '',
    );
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
    setImages(imagePaths(product.images).map((u) => ({ id: u, kind: 'existing', url: u })));
    setErr('');
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesErr('');
    apiFetch('/api/categories', { skipAuth: true })
      .then((res) => {
        if (cancelled) return;
        const cats = Array.isArray(res?.data?.categories) ? res.data.categories : [];
        setCategoriesList(cats.filter((c) => c && typeof c.name === 'string' && c.name.trim()));
      })
      .catch(() => {
        if (!cancelled) setCategoriesErr('Kategori listesi yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (product) return;
    if (!categoriesList.length) return;
    setCategory((prev) => (prev && prev.trim() ? prev : String(categoriesList[0]?.name ?? '')));
  }, [product, categoriesList]);

  useEffect(() => {
    if (!product || categoriesLoading || categoriesErr || !categoriesList.length) return;
    const cur = String(product.category || '').trim();
    if (!cur || categoriesList.some((c) => c.name === cur)) return;
    setCategory(categoriesList[0]?.name ? String(categoriesList[0].name) : '');
    setErr('Önceki kategori adı güncel listede yok; lütfen listeden seçin.');
  }, [product, categoriesList, categoriesLoading, categoriesErr]);

  const slotsLeft = Math.max(0, 5 - images.length);

  /** @param {FileList | null} fileList */
  const appendImagesFromPicker = (fileList) => {
    const incoming = [...(fileList || [])].filter((f) => f instanceof File);
    if (!incoming.length) return;
    setImages((cur) => {
      const next = [...cur];
      for (const f of incoming) {
        if (next.length >= 5) break;
        const url = URL.createObjectURL(f);
        blobUrlsRef.current.push(url);
        next.push({ id: url, kind: 'new', url, file: f });
      }
      return next;
    });
  };

  const removeImageAt = (idx) => {
    setImages((cur) => {
      const next = [...cur];
      const [gone] = next.splice(idx, 1);
      if (gone?.kind === 'new' && gone.url) {
        URL.revokeObjectURL(gone.url);
        blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== gone.url);
      }
      return next;
    });
  };

  /** Bir görseli yeni konuma taşır (sürükle-bırak ve kapak yap için). */
  const moveImage = (from, to) => {
    setImages((cur) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= cur.length ||
        to >= cur.length
      ) {
        return cur;
      }
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const makeCover = (idx) => moveImage(idx, 0);

  const addVariantRow = () => {
    const uid =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    setVariants((v) => [...v, { uid, name: `Seçenek ${v.length + 1}`, stock: 0, priceExtra: '' }]);
  };

  const updateVariant = (uid, patch) =>
    setVariants((rows) => rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

  const removeVariant = (uid) => setVariants((rows) => rows.filter((r) => r.uid !== uid));

  const runAutoSeo = async () => {
    if (!name.trim()) {
      setErr('SEO üretmek için önce ürün adını doldurun.');
      return;
    }
    setErr('');
    setSeoBusy(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim(),
        category: category.trim(),
        description: typeof description === 'string' ? description : '',
      };
      if (product?.id) payload.excludeProductId = product.id;
      const res = await apiFetch('/api/products/generate-seo', { method: 'POST', body: payload });
      const d = res?.data;
      if (!d || typeof d !== 'object') throw new Error('Sunucu yanıtı beklenmedik.');
      setSlug(typeof d.slug === 'string' ? d.slug : '');
      setMetaTitle(typeof d.meta_title === 'string' ? d.meta_title : '');
      setMetaDesc(typeof d.meta_description === 'string' ? d.meta_description : '');
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'SEO üretilemedi.');
    } finally {
      setSeoBusy(false);
    }
  };

  const computePrices = () => {
    const L = parseDecimalInput(priceList);
    const Dtrim = priceDiscounted.trim();
    const D = Dtrim === '' ? NaN : parseDecimalInput(priceDiscounted);

    let priceOut = '';
    let origOut = null;

    if (Number.isFinite(D) && D >= 0) {
      priceOut = D.toFixed(2);
      if (Number.isFinite(L) && L > D) origOut = L.toFixed(2);
      else origOut = null;
    } else if (Number.isFinite(L) && L >= 0) {
      priceOut = L.toFixed(2);
      origOut = null;
    }

    const finalNum = Number.parseFloat(priceOut);
    return { priceOut, origOut, finalNum };
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const planInt = parseInt(String(planPct).trim(), 10);
    const usePlan =
      Number.isFinite(planInt) && planInt >= 1 && planInt <= 99;

    if (usePlan && priceDiscounted.trim() !== '') {
      setErr('Planlı indirimde "İndirimli fiyat" alanını boş bırakın (yalnızca liste fiyatı kullanılır).');
      return;
    }

    let { priceOut, origOut, finalNum } = computePrices();
    let plannedDiscStartIso = '';
    let plannedDiscEndIso = '';

    if (usePlan) {
      const baseListe = parseDecimalInput(priceList);
      if (!Number.isFinite(baseListe) || baseListe <= 0) {
        setErr('Planlı indirim için geçerli liste fiyatı gerekli.');
        return;
      }
      const startIsoDraft =
        planStart.trim() === '' ? null : localDatetimeToUtcIso(planStart.trim());
      if (planStart.trim() !== '' && !startIsoDraft) {
        setErr('İndirim başlangıç tarih/saat geçersiz.');
        return;
      }
      const endDraft = planEnd.trim() === '' ? null : localDatetimeToUtcIso(planEnd.trim());
      if (planEnd.trim() !== '' && !endDraft) {
        setErr('İndirim bitiş tarih/saat geçersiz.');
        return;
      }
      const startResolved = planStart.trim() === '' ? new Date().toISOString() : startIsoDraft;
      if (endDraft && new Date(endDraft) <= new Date(startResolved)) {
        setErr('İndirim bitiş zamanı başlangıçtan sonra olmalıdır.');
        return;
      }
      priceOut = baseListe.toFixed(2);
      origOut = baseListe.toFixed(2);
      finalNum = baseListe;
      plannedDiscStartIso = startResolved || '';
      plannedDiscEndIso = endDraft ?? '';
    }
    const textOnly =
      typeof description === 'string'
        ? description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        : '';

    const st = parseInt(stock, 10);
    const stockOk = Number.isFinite(st) && st >= 0 ? st : 0;

    const variantPayload = variants.map((r) => {
      const px = parseDecimalInput(r.priceExtra);
      const row = {
        id: r.uid,
        name: r.name.trim(),
        stock: r.stock,
      };
      if (Number.isFinite(px) && px >= 0 && px !== 0) row.priceExtra = px;
      return row;
    });

    if (!name.trim()) {
      setErr('Ürün adı zorunlu.');
      return;
    }
    if (categoriesLoading) {
      setErr('Kategoriler yükleniyor…');
      return;
    }
    if (categoriesErr) {
      setErr('Kategori listesi yüklenemedi; sayfayı yenileyin.');
      return;
    }
    if (!categoriesList.length) {
      setErr('Kayıtlı kategori yok. Önce sistemde kategori tanımlayın.');
      return;
    }
    const catTrim = category.trim();
    if (!catTrim || !categoriesList.some((c) => c.name === catTrim)) {
      setErr('Lütfen listeden bir kategori seçin.');
      return;
    }
    if (!textOnly) {
      setErr('Ürün açıklaması zorunlu.');
      return;
    }
    if (!Number.isFinite(finalNum) || finalNum < 0) {
      setErr('Geçerli fiyat girin.');
      return;
    }

    const Dcheck = priceDiscounted.trim() === '' ? NaN : parseDecimalInput(priceDiscounted);
    const Lcheck = parseDecimalInput(priceList);
    if (!usePlan && Number.isFinite(Dcheck) && Dcheck >= 0) {
      if (!Number.isFinite(Lcheck) || Lcheck <= Dcheck) {
        setErr('İndirimli fiyat için liste fiyatı, indirimli fiyattan yüksek olmalıdır.');
        return;
      }
    }

    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('description', description.trim());
    fd.append('price', priceOut);
    fd.append('original_price', origOut ?? '');
    fd.append('stock', String(stockOk));
    fd.append('brand', brand.trim());
    fd.append('category', catTrim);
    fd.append('skin_type', skinType);
    fd.append('tag', tag.trim() || 'yok');
    fd.append('slug', slug.trim());
    fd.append('meta_title', metaTitle.trim());
    fd.append('meta_description', metaDesc.trim());
    fd.append('barcode', barcode.trim());
    fd.append('variants', JSON.stringify(variantPayload));

    if (usePlan) {
      fd.append('discountPercent', String(planInt));
      fd.append('discountStartsAt', plannedDiscStartIso);
      fd.append('discountExpiresAt', plannedDiscEndIso ?? '');
    } else {
      fd.append('discountPercent', '');
      fd.append('discountStartsAt', '');
      fd.append('discountExpiresAt', '');
    }

    if (mode === 'edit' && product) {
      fd.append(
        'existingImages',
        JSON.stringify(images.filter((it) => it.kind === 'existing').map((it) => it.url)),
      );
    }

    // Kesin sıra + dosyalar (kapak = ilk eleman). new:<index> dosya sırasıyla eşleşir.
    const order = [];
    let newIdx = 0;
    images.forEach((it) => {
      if (it.kind === 'existing') {
        order.push(`existing:${it.url}`);
      } else if (it.file) {
        fd.append('images', it.file);
        order.push(`new:${newIdx}`);
        newIdx += 1;
      }
    });
    fd.append('imageOrder', JSON.stringify(order));

    setBusy(true);
    try {
      if (mode === 'edit' && product) {
        await apiFetch(`/api/products/${product.id}`, { method: 'PUT', body: fd });
      } else {
        await apiFetch('/api/products', { method: 'POST', body: fd });
      }
      onSaved();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Kayıt başarısız.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'edit' ? 'Ürünü düzenle' : 'Yeni ürün';
  const metaLen = metaTitle.length;
  const mdLen = metaDesc.length;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:p-5 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="product-editor-title"
      onMouseDown={(evt) => {
        if (evt.target === evt.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-neutral-50 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h3 id="product-editor-title" className="text-xl font-semibold text-asta-navy">
              {title}
            </h3>
            {mode === 'edit' && product ? (
              <p className="mt-1 text-xs font-mono text-neutral-500">{product.id}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-transparent p-2 text-neutral-500 hover:border-neutral-200 hover:bg-neutral-50 hover:text-asta-navy"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6 [&_.ql-container]:rounded-b-xl [&_.ql-editor]:text-sm [&_.ql-toolbar.ql-snow+.ql-container.ql-snow]:border-neutral-200 [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border [&_.ql-toolbar]:border-neutral-200">
            {err ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                {err}
              </div>
            ) : null}

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Ürün görselleri (maks 5)
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                İlk sıradaki görsel <strong>kapak resmi</strong> olur. Görselleri sürükleyerek sıralayabilir
                veya yıldız butonuna basarak kapak yapabilirsin.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((it, idx) => {
                  const isCover = idx === 0;
                  const src = it.kind === 'existing' ? mediaUrl(it.url) : it.url;
                  return (
                    <div
                      key={it.id}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex !== null) moveImage(dragIndex, idx);
                        setDragIndex(null);
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      className={`group relative h-[96px] w-[96px] cursor-move overflow-hidden rounded-xl border bg-neutral-50 ${
                        isCover ? 'border-2 border-brand' : 'border border-dashed border-neutral-200'
                      } ${dragIndex === idx ? 'opacity-50' : ''}`}
                      title="Sürükleyerek sırala"
                    >
                      <img src={src} alt="" className="h-full w-full object-contain p-1" />

                      <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/45 p-0.5 text-white">
                        <GripVertical className="h-3 w-3" strokeWidth={2} />
                      </span>

                      {isCover ? (
                        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                          <Star className="h-3 w-3 fill-current" strokeWidth={2} /> Kapak
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCover(idx)}
                          title="Kapak yap"
                          aria-label="Kapak yap"
                          className="absolute bottom-1 left-1 rounded-full bg-white/95 p-1 text-amber-500 shadow hover:bg-white"
                        >
                          <Star className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImageAt(idx)}
                        title="Kaldır"
                        aria-label="Görseli kaldır"
                        className="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-rose-600 shadow hover:bg-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
                {slotsLeft > 0 ? (
                  <label className="flex h-[96px] w-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center hover:border-brand/35 hover:bg-brand-muted/25">
                    <CloudUpload className="h-5 w-5 text-brand" strokeWidth={1.5} />
                    <span className="text-[11px] font-semibold text-asta-navy">Ekle</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(ev) => {
                        appendImagesFromPicker(ev.target.files);
                        ev.target.value = '';
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Ürün adı
              </label>
              <input
                className={`mt-2 ${inputClass}`}
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                placeholder="Ürün adı"
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500">Marka</label>
                  <input className={`mt-2 ${inputClass}`} value={brand} onChange={(ev) => setBrand(ev.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500">Kategori</label>
                  <select
                    className={`mt-2 ${inputClass}`}
                    value={category}
                    onChange={(ev) => setCategory(ev.target.value)}
                    disabled={
                      categoriesLoading ||
                      !!categoriesErr ||
                      (!categoriesLoading && !categoriesList.length)
                    }
                  >
                    {categoriesLoading ? (
                      <option value={category}>{category.trim() ? category : 'Yükleniyor…'}</option>
                    ) : categoriesErr ? (
                      <option value="">—</option>
                    ) : categoriesList.length === 0 ? (
                      <option value="">Kategori yok</option>
                    ) : (
                      categoriesList.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                  {categoriesErr ? (
                    <p className="mt-1 text-[10px] text-red-600">{categoriesErr}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500">Fiyat (₺)</label>
                  <input
                    className={`mt-2 ${inputClass}`}
                    inputMode="decimal"
                    value={priceList}
                    placeholder={mode === 'create' ? 'Liste fiyatı' : ''}
                    onChange={(ev) => setPriceList(ev.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-neutral-500">İndirim yoksa yalnızca bu tutarı girin.</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500">İndirimli fiyat</label>
                  <input
                    className={`mt-2 ${inputClass}`}
                    inputMode="decimal"
                    placeholder="Satış · isteğe bağlı"
                    value={priceDiscounted}
                    onChange={(ev) => setPriceDiscounted(ev.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500">Stok</label>
                  <input
                    type="number"
                    min={0}
                    className={`mt-2 ${inputClass}`}
                    value={stock}
                    onChange={(ev) => setStock(ev.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-[11px] font-bold uppercase text-neutral-500">
                  Barkod kodu
                </label>
                <input
                  className={`mt-2 ${inputClass}`}
                  value={barcode}
                  onChange={(ev) => setBarcode(ev.target.value)}
                  placeholder="Örn. 8690000000000"
                  inputMode="text"
                  autoComplete="off"
                  maxLength={64}
                />
                <p className="mt-1 text-[10px] text-neutral-500">
                  Yalnızca yönetim için — müşterilere gösterilmez. İç stok/etiket takibinde kullanılır.
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/55 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-950">
                  İsteğe bağlı planlı yüzde indirimi
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-amber-900/90">
                  Yüzde doldurulursa ilk fiyat kutusu liste fiyatı olarak kaydedilir; sunucu belirttiğiniz zamanlarda satış
                  fiyatını günceller. Bu modda &quot;İndirimli fiyat&quot; boş olmalıdır. Yüzdeyi boş bıraktığınızda
                  yüzdelik zaman çizelgesi değişmez; kaldırmak için ürün listesinde toplu &quot;İndirimi kaldır&quot;
                  kullanın.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-neutral-500">İndirim %</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className={`mt-2 ${inputClass}`}
                      value={planPct}
                      onChange={(ev) => setPlanPct(ev.target.value)}
                      placeholder="Boş = yok say"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-neutral-500">Başlangıç</label>
                    <input
                      type="datetime-local"
                      className={`mt-2 ${inputClass}`}
                      value={planStart}
                      onChange={(ev) => setPlanStart(ev.target.value)}
                    />
                    <p className="mt-1 text-[10px] text-neutral-500">Boş: hemen</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-neutral-500">Bitiş</label>
                    <input
                      type="datetime-local"
                      className={`mt-2 ${inputClass}`}
                      value={planEnd}
                      onChange={(ev) => setPlanEnd(ev.target.value)}
                    />
                    <p className="mt-1 text-[10px] text-neutral-500">Boş: süre sınırı yok</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500">Cilt tipi</label>
                  <select
                    className={`mt-2 ${inputClass}`}
                    value={skinType}
                    onChange={(ev) => setSkinType(ev.target.value)}
                  >
                    {SKIN_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500">Etiket</label>
                  <select className={`mt-2 ${inputClass}`} value={tag} onChange={(ev) => setTag(ev.target.value)}>
                    {TAG_PRESETS.every((o) => o.value !== tag) && tag ? (
                      <option value={tag}>{tag}</option>
                    ) : null}
                    {TAG_PRESETS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-neutral-50/90 p-4 shadow-inner sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-asta-navy">
                  <Globe className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  SEO ayarları
                </div>
                <button
                  type="button"
                  disabled={seoBusy || busy || !name.trim()}
                  onClick={runAutoSeo}
                  title="Slug, meta başlık ve meta açıklamayı marka/kategori/açıklamadan tek sefer üretir"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-400"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  {seoBusy ? 'Üretiliyor…' : 'SEO paketini üret'}
                </button>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-neutral-600">
                Slug ile meta başlık ve açıklama birlikte üretilir (çakışan URL’ler sunucuda -2, -3 … ile düzeltilir).
                Bu alanları boş kaydederseniz sunucu aynı mantıkla otomatik tamamlar.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">URL (slug)</label>
                  <input
                    className={`mt-2 ${inputClass}`}
                    value={slug}
                    onChange={(ev) => setSlug(ev.target.value)}
                    placeholder="marka-urun-adi"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase text-neutral-500">Meta başlık</label>
                    <span className="text-[10px] tabular-nums text-neutral-400">({metaLen}/70)</span>
                  </div>
                  <input
                    className={`mt-2 ${inputClass}`}
                    maxLength={70}
                    value={metaTitle}
                    onChange={(ev) => setMetaTitle(ev.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase text-neutral-500">Meta açıklama</label>
                    <span className="text-[10px] tabular-nums text-neutral-400">({mdLen}/200)</span>
                  </div>
                  <textarea
                    className={`mt-2 min-h-[92px] resize-y ${inputClass}`}
                    maxLength={200}
                    value={metaDesc}
                    onChange={(ev) => setMetaDesc(ev.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Ürün seçenekleri</p>
                  <p className="mt-1 text-xs text-neutral-500">Seçenek eklenmediyse genel stok kullanılır.</p>
                </div>
                <button
                  type="button"
                  onClick={addVariantRow}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-asta-navy px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:opacity-95"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Seçenek ekle
                </button>
              </div>
              {variants.length === 0 ? (
                <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-xs text-neutral-500">
                  Henüz seçenek yok.
                </p>
              ) : (
                <div className="space-y-2">
                  {variants.map((r) => (
                    <div key={r.uid} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50/90 px-3 py-2">
                      <input
                        className={`min-w-[100px] flex-1 rounded-lg py-2 text-xs ${inputClass}`}
                        value={r.name}
                        onChange={(ev) => updateVariant(r.uid, { name: ev.target.value })}
                      />
                      <input
                        type="number"
                        min={0}
                        className="w-[5.25rem] rounded-lg py-2 text-xs tabular-nums"
                        value={r.stock}
                        onChange={(ev) =>
                          updateVariant(r.uid, { stock: Math.max(0, parseInt(ev.target.value, 10) || 0) })
                        }
                      />
                      <input
                        className="w-[6.75rem] rounded-lg py-2 text-xs"
                        placeholder="+₺ fark"
                        value={r.priceExtra}
                        onChange={(ev) => updateVariant(r.uid, { priceExtra: ev.target.value })}
                      />
                      <button type="button" onClick={() => removeVariant(r.uid)} className="rounded-full p-1.5 text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 pb-6 shadow-sm sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Ürün açıklaması</p>
              <div className="mt-2 min-h-[200px]">
                <ReactQuill theme="snow" value={description} onChange={setDescription} modules={quillModules} formats={quillFormats} />
              </div>
            </section>

          </div>

          <div className="shrink-0 border-t border-neutral-200 bg-white/95 backdrop-blur-sm px-4 py-4 sm:px-6">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={busy || categoriesLoading || !!categoriesErr || (!categoriesLoading && categoriesList.length === 0)}
                className="inline-flex flex-1 min-w-[220px] items-center justify-center rounded-xl bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover disabled:bg-neutral-400"
              >
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

