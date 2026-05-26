import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  BarChart3,
  ChartPie,
  Clock,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
  UserCircle2,
  Users,
  XCircle,
  AlertTriangle,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { apiFetch } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { mediaUrl } from '../../lib/mediaUrl.js';
import { pickProductImagePath } from '../../lib/productMap.js';
import { ORDER_STATUSES, orderStatusLabel } from './constants.js';

const RANGES = [
  { id: 'daily', label: 'Bugün' },
  { id: 'weekly', label: 'Bu Hafta' },
  { id: 'monthly', label: 'Bu Ay' },
  { id: 'yearly', label: 'Bu Yıl' },
  { id: 'all', label: 'Tümü' },
];

/** @param {string | Date | undefined | null} v */
function formatTrDate(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}.${mo}.${y}`;
}

/** @param {string} status */
function statusTone(status) {
  switch (status) {
    case 'hazirlaniyor':
      return 'bg-sky-100 text-sky-800';
    case 'kargolandi':
      return 'bg-indigo-100 text-indigo-800';
    case 'teslim-edildi':
      return 'bg-emerald-100 text-emerald-800';
    case 'iptal-edildi':
      return 'bg-rose-100 text-rose-800';
    case 'odeme_bekleniyor':
      return 'bg-amber-100 text-amber-900';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
}

const CHART_PRIMARY = '#9f2133';
const PIE_FALLBACK = ['#9f2133', '#1a2332', '#6b7280', '#059669', '#dc2626', '#0284c7'];

export default function AdminDashboardPage() {
  const [range, setRange] = useState('monthly');
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError('');
    apiFetch(`/api/orders/stats?time=${encodeURIComponent(range)}`, { signal: ac.signal })
      .then((res) => setData(res?.data ?? null))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message || 'İstatistikler yüklenemedi.');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [range, nonce]);

  const pieData = useMemo(() => {
    if (!data?.statusCounts) return [];
    return ORDER_STATUSES.map((s, i) => ({
      key: s.value,
      name: s.label,
      value: Number(data.statusCounts[s.value]) || 0,
      color: PIE_FALLBACK[i % PIE_FALLBACK.length],
    })).filter((d) => d.value > 0);
  }, [data]);

  const barData = useMemo(() => {
    const sellers = Array.isArray(data?.topSellers) ? data.topSellers : [];
    if (sellers.length === 0) return [];
    const max = Math.max(...sellers.map((s) => Number(s.salesCount) || 0), 1);
    return sellers.map((s) => ({
      name: s.name.length > 42 ? `${s.name.slice(0, 40)}…` : s.name,
      qty: Number(s.salesCount) || 0,
      fillPct: Math.max(12, Math.round(((Number(s.salesCount) || 0) / max) * 100)),
    }));
  }, [data]);

  const kpiDefs = [
    {
      title: 'Toplam gelir',
      value: data ? formatTRY(Number(data.totalEarnings) || 0) : '—',
      icon: Banknote,
      boxClass: 'bg-emerald-600 text-white shadow-inner',
      hint: 'Dönem içi · ödemesi tamamlanan',
    },
    {
      title: 'Toplam sipariş',
      value: loading ? '…' : String(data?.ordersCount ?? '—'),
      icon: ShoppingBag,
      boxClass: 'bg-sky-600 text-white shadow-inner',
      hint: 'Dönem · hazır/kargo/teslim',
    },
    {
      title: 'Hazırlanıyor (kuyruk)',
      value: loading ? '…' : String(data?.pendingOrdersCount ?? '—'),
      icon: Clock,
      boxClass: 'bg-[#ea580c] text-white shadow-inner',
      hint: 'Tüm zamanlar · operasyon sırası',
    },
    {
      title: 'Müşteri sayısı',
      value: loading ? '…' : String(data?.customerCount ?? '—'),
      icon: Users,
      boxClass: 'bg-violet-600 text-white shadow-inner',
      hint: 'Kayıtlı müşteri rolü',
    },
    {
      title: 'Kargoda',
      value: loading ? '…' : String(data?.shippedCount ?? data?.statusCounts?.kargolandi ?? '—'),
      icon: Truck,
      boxClass: 'bg-[#0369a1] text-white shadow-inner',
      hint: 'Dönem filtresine göre',
    },
    {
      title: 'Teslim edildi',
      value: loading ? '…' : String(data?.deliveredCount ?? data?.statusCounts?.['teslim-edildi'] ?? '—'),
      icon: Package,
      boxClass: 'bg-teal-600 text-white shadow-inner',
      hint: 'Dönem filtresine göre',
    },
    {
      title: 'İptal edildi',
      value: loading ? '…' : String(data?.cancelledCount ?? data?.statusCounts?.['iptal-edildi'] ?? '—'),
      icon: XCircle,
      boxClass: 'bg-rose-600 text-white shadow-inner',
      hint: 'Dönem filtresine göre',
    },
    {
      title: 'Düşük stok',
      value: loading ? '…' : String(data?.lowStockCount ?? '—'),
      icon: AlertTriangle,
      boxClass: 'bg-amber-500 text-neutral-900 shadow-inner',
      hint: data?.lowStockThreshold != null ? `Eşik ≤ ${data.lowStockThreshold}` : 'Eşik ayarından',
    },
  ];

  return (
    <div className="space-y-10 font-sans">
      {/* Başlık + dönem + yenile */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-asta-navy">
            Genel bakış
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Mağaza performansını döneme göre izleyin; grafik ve tablolar canlı API verisinden beslenir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={loading}
              onClick={() => setRange(r.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                range === r.id
                  ? 'bg-brand-muted text-brand ring-2 ring-brand/35 shadow-sm'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:border-brand/30 hover:bg-neutral-50'
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-brand-muted hover:text-brand disabled:opacity-50"
            title="Verileri yenile"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      {/* KPI ızgara */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiDefs.map(({ title, value, icon: Icon, boxClass, hint }) => (
          <div
            key={title}
            className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-card transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${boxClass}`}>
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{title}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums leading-none text-asta-navy">{value}</p>
                <p className="mt-2 text-xs leading-snug text-neutral-500">{hint}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 font-bold text-asta-navy">
          <LineChartIcon className="h-5 w-5 text-brand" strokeWidth={1.75} />
          Son 7 gün — gelir trendi
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Ödemesi tamamlanmış siparişler · KDV dahil tutar (₺).
        </p>
        <div className="mt-6 h-72 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">Yükleniyor…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueTrend || []}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="#e8e8e8" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#e5e5e5' }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e5e5' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: '#e5e7eb',
                    fontSize: 13,
                  }}
                  formatter={(val, key) =>
                    key === 'revenue' ? [formatTRY(Number(val)), 'Ciro'] : [val, 'Sipariş']
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="gelir"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2.5}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Pasta */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="flex items-center gap-2 font-bold text-asta-navy">
            <ChartPie className="h-5 w-5 text-brand" strokeWidth={1.75} />
            Sipariş durumu dağılımı
          </h3>
          <p className="mt-1 text-xs text-neutral-500">Seçilen dönem için sipariş adetleri.</p>
          <div className="mt-4 flex h-[260px] items-center justify-center">
            {!loading && pieData.length === 0 && (
              <p className="text-sm text-neutral-500">Bu dönemde sipariş yok.</p>
            )}
            {loading ? (
              <p className="text-sm text-neutral-500">Yükleniyor…</p>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} sipariş`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 justify-center border-t border-neutral-100 pt-4">
            {pieData.map((d) => (
              <span key={d.key} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden /> {d.name}
              </span>
            ))}
          </div>
        </div>

        {/* Yatay çok satanlar */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="flex items-center gap-2 font-bold text-asta-navy">
            <BarChart3 className="h-5 w-5 text-brand" strokeWidth={1.75} />
            En çok satanlar
          </h3>
          <p className="mt-1 text-xs text-neutral-500">Dönem içi adet (ödemesi alınmış siparişler).</p>
          <div className="mt-4 h-[280px] w-full">
            {!loading && barData.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-neutral-500">Veri yok.</div>
            )}
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-500">Yükleniyor…</div>
            ) : barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="4 8" horizontal={false} stroke="#eee" />
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={118}
                    tick={{ fill: '#4b5563', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(159,33,51,0.06)' }}
                    formatter={(v) => [`${v} adet`, 'Satış']}
                  />
                  <Bar dataKey="qty" radius={[0, 8, 8, 0]} barSize={18} fill={CHART_PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Düşük stok */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4">
          <h3 className="flex items-center gap-2 font-bold text-asta-navy">
            <AlertTriangle className="h-5 w-5 text-brand" strokeWidth={1.75} />
            Düşük stoklu ürünler
          </h3>
          <Link
            to="/admin/urunler"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Ürün yönetimi <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-6 py-3">Ürün</th>
                <th className="px-6 py-3">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(data?.lowStockProducts || []).length === 0 && !loading && (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-neutral-500">
                    Düşük stok uyarısı yok.
                  </td>
                </tr>
              )}
              {(data?.lowStockProducts || []).map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/70">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        {pickProductImagePath(p.images) ? (
                          <img
                            alt=""
                            className="h-full w-full object-contain p-1"
                            src={mediaUrl(pickProductImagePath(p.images))}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                            —
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.brand || 'Marka —'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold tabular-nums text-rose-800 ring-1 ring-rose-200">
                      {p.stock}
                    </span>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-neutral-500">
                    …
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Son siparişler tablo */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4">
          <h3 className="flex items-center gap-2 font-bold text-asta-navy">
            <UserCircle2 className="h-5 w-5 text-brand" strokeWidth={1.75} />
            Son siparişler
          </h3>
          <Link
            to="/admin/siparisler"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Tümünü gör <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full divide-y divide-neutral-100 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="px-6 py-3">Sipariş no</th>
                <th className="px-6 py-3">Müşteri</th>
                <th className="px-6 py-3 text-right">Tutar</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3 text-right">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {(data?.recentOrders || []).length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    Kayıt yok.
                  </td>
                </tr>
              )}
              {(data?.recentOrders || []).map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-asta-navy">
                    #{String(o.id).replace(/-/g, '').slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-neutral-900">{o.fullName}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{o.email}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold tabular-nums text-brand">
                    {formatTRY(Number(o.totalAmount) || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(o.status)}`}
                    >
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums text-neutral-600">
                    {formatTrDate(o.createdAt)}
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
