import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Clock,
  ExternalLink,
  LineChart as LineChartIcon,
  MessageCircleQuestion,
  MessageSquare,
  Package,
  RefreshCw,
  ShoppingBag,
  TicketPercent,
  TrendingDown,
  TrendingUp,
  UserCircle2,
  Users,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiFetch } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { mediaUrl } from '../../lib/mediaUrl.js';
import { pickProductImagePath } from '../../lib/productMap.js';
import { orderStatusLabel } from './constants.js';

const RANGES = [
  { id: 'daily', label: 'Bugün' },
  { id: 'weekly', label: 'Bu Hafta' },
  { id: 'monthly', label: 'Bu Ay' },
  { id: 'yearly', label: 'Bu Yıl' },
  { id: 'all', label: 'Tümü' },
];

const CHART_PRIMARY = '#9f2133';
const CHART_SECONDARY = '#1a2332';
const PIE_COLORS = ['#9f2133', '#1a2332', '#6b7280'];

const QUICK_LINKS = [
  { to: '/', label: 'Mağazayı gör', external: true },
  { to: '/admin/siparisler', label: 'Siparişler' },
  { to: '/admin/urunler', label: 'Ürünler' },
  { to: '/admin/kuponlar', label: 'Kuponlar' },
  { to: '/admin/sistem/kategoriler', label: 'Sistem ayarları' },
];

/** @param {string | Date | undefined | null} v */
function formatTrDateTime(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    return '—';
  }
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

/** @param {{ changePercent?: number | null; changeAmount?: number; label?: string; money?: boolean }} props */
function ComparisonBadge({ changePercent, changeAmount, label = 'önceki döneme göre', money = false }) {
  if (changePercent == null) {
    return <p className="mt-2 text-xs text-neutral-500">Karşılaştırma yok</p>;
  }
  const positive = changePercent >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const tone = positive ? 'text-emerald-700' : 'text-rose-700';
  const amountText =
    money && changeAmount != null ? ` (${positive ? '+' : ''}${formatTRY(changeAmount)})` : '';

  return (
    <p className={`mt-2 inline-flex flex-wrap items-center gap-1 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {positive ? '+' : ''}
      {changePercent.toFixed(1)}%{amountText}
      <span className="font-normal text-neutral-500"> · {label}</span>
    </p>
  );
}

/** @param {{ title: string; value: string; hint?: string; icon: import('lucide-react').LucideIcon; accent?: string; comparison?: Record<string, unknown>; moneyComparison?: boolean }} props */
function KpiCard({ title, value, hint, icon: Icon, accent = 'bg-brand', comparison, moneyComparison }) {
  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-inner ${accent}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums leading-none text-asta-navy">{value}</p>
          {hint ? <p className="mt-2 text-xs text-neutral-500">{hint}</p> : null}
          {comparison ? (
            <ComparisonBadge
              changePercent={/** @type {number | null} */ (comparison.changePercent)}
              changeAmount={/** @type {number} */ (comparison.changeAmount)}
              money={moneyComparison}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** @param {{ count: number; label: string; href: string; icon: import('lucide-react').LucideIcon; tone: string }} props */
function ActionCard({ count, label, href, icon: Icon, tone }) {
  return (
    <Link
      to={href}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card transition-all hover:border-brand/30 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-asta-navy">{count}</p>
          <p className="text-xs font-medium text-neutral-600">{label}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState('monthly');
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [topSellerMode, setTopSellerMode] = useState('revenue');

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError('');
    apiFetch(`/api/orders/stats/v2?time=${encodeURIComponent(range)}`, { signal: ac.signal })
      .then((res) => setData(res?.data ?? null))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message || 'İstatistikler yüklenemedi.');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [range, nonce]);

  const topSellers = useMemo(() => {
    if (!data?.topSellers) return [];
    return topSellerMode === 'qty' ? data.topSellers.byQuantity || [] : data.topSellers.byRevenue || [];
  }, [data, topSellerMode]);

  const customerPie = useMemo(() => {
    if (!data?.customerMix) return [];
    const { newOrders = 0, returningOrders = 0 } = data.customerMix;
    return [
      { name: 'Yeni müşteri', value: newOrders, color: PIE_COLORS[0] },
      { name: 'Geri dönen', value: returningOrders, color: PIE_COLORS[1] },
    ].filter((d) => d.value > 0);
  }, [data]);

  const trendTitle = useMemo(() => {
    switch (range) {
      case 'daily':
        return 'Bugün — saatlik ciro ve sipariş';
      case 'weekly':
        return 'Son 7 gün — ciro ve sipariş';
      case 'monthly':
        return 'Son 30 gün — ciro ve sipariş';
      case 'yearly':
        return 'Son 12 ay — ciro ve sipariş';
      default:
        return 'Dönem — ciro ve sipariş';
    }
  }, [range]);

  const comp = data?.comparison;
  const hero = data?.heroKpis;
  const actions = data?.actionItems;
  const store = data?.storeSnapshot;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-asta-navy">Mağaza özeti</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {data?.period?.label || 'Bu ay'}
            {data?.period?.hasComparison ? ' · önceki dönemle karşılaştırmalı' : ''}
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

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((item) =>
          item.external ? (
            <a
              key={item.to}
              href={item.to}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm hover:border-brand/30 hover:text-brand"
            >
              {item.label}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </a>
          ) : (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm hover:border-brand/30 hover:text-brand"
            >
              {item.label}
            </Link>
          ),
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-bold text-asta-navy">İşlem bekleyenler</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            count={actions?.preparingOrders ?? 0}
            label="Hazırlanacak sipariş"
            href="/admin/siparisler"
            icon={Clock}
            tone="bg-orange-100 text-orange-800"
          />
          <ActionCard
            count={actions?.unansweredQuestions ?? 0}
            label="Cevapsız müşteri sorusu"
            href="/admin/sorular"
            icon={MessageCircleQuestion}
            tone="bg-sky-100 text-sky-800"
          />
          <ActionCard
            count={actions?.pendingReviews ?? 0}
            label="Onay bekleyen yorum"
            href="/admin/yorumlar"
            icon={MessageSquare}
            tone="bg-violet-100 text-violet-800"
          />
          <ActionCard
            count={actions?.lowStockCount ?? 0}
            label="Düşük stoklu ürün"
            href="/admin/urunler"
            icon={AlertTriangle}
            tone="bg-amber-100 text-amber-900"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Toplam ciro"
          value={loading ? '…' : formatTRY(Number(hero?.totalRevenue) || 0)}
          hint="Ödemesi alınan siparişler"
          icon={Banknote}
          accent="bg-emerald-600"
          comparison={comp?.revenue}
          moneyComparison
        />
        <KpiCard
          title="Sipariş adedi"
          value={loading ? '…' : String(hero?.ordersCount ?? '—')}
          hint="Tamamlanan ödemeler"
          icon={ShoppingBag}
          accent="bg-sky-600"
          comparison={comp?.orders}
        />
        <KpiCard
          title="Ortalama sepet"
          value={loading ? '…' : formatTRY(Number(hero?.averageBasket) || 0)}
          hint="Ciro ÷ sipariş"
          icon={BarChart3}
          accent="bg-violet-600"
          comparison={comp?.averageBasket}
          moneyComparison
        />
        <KpiCard
          title="İptal tutarı"
          value={loading ? '…' : formatTRY(Number(hero?.cancelledAmount) || 0)}
          hint="İptal edilen siparişler"
          icon={TrendingDown}
          accent="bg-rose-600"
          comparison={comp?.cancelledAmount}
          moneyComparison
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Ödeme bekleyen</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-asta-navy">
            {loading ? '…' : `${hero?.awaitingPaymentCount ?? 0} sipariş`}
          </p>
          <p className="mt-1 text-sm font-semibold text-brand">
            {loading ? '…' : formatTRY(Number(hero?.awaitingPaymentAmount) || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Kayıtlı müşteri</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums text-asta-navy">
            <Users className="h-5 w-5 text-brand" aria-hidden />
            {loading ? '…' : String(store?.customerCount ?? '—')}
          </p>
          <Link to="/admin/kullanicilar" className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">
            Kullanıcılar →
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Aktif ürün</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums text-asta-navy">
            <Package className="h-5 w-5 text-brand" aria-hidden />
            {loading ? '…' : String(store?.activeProductCount ?? '—')}
          </p>
          <Link to="/admin/urunler" className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">
            Ürün yönetimi →
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Kupon kullanımı</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-brand">
            %{data?.couponStats?.couponOrderSharePercent ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {data?.couponStats?.ordersWithCoupon ?? 0} kuponlu sipariş
          </p>
          <Link to="/admin/kuponlar" className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">
            Kuponlar →
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 font-bold text-asta-navy">
          <LineChartIcon className="h-5 w-5 text-brand" strokeWidth={1.75} />
          {trendTitle}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">Alan: ciro (₺) · Çizgi: sipariş adedi</p>
        <div className="mt-6 h-72 w-full sm:h-80">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">Yükleniyor…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.trend || []}>
                <defs>
                  <linearGradient id="dashRevFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="#e8e8e8" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e5e5' }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: '#e5e5e5' }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb', fontSize: 13 }}
                  formatter={(val, key) =>
                    key === 'revenue' ? [formatTRY(Number(val)), 'Ciro'] : [val, 'Sipariş']
                  }
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2.5}
                  fill="url(#dashRevFill)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orderCount"
                  stroke={CHART_SECONDARY}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_SECONDARY }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="font-bold text-asta-navy">Sipariş durumları</h3>
          <p className="mt-1 text-xs text-neutral-500">Seçilen dönemdeki dağılım</p>
          <div className="mt-5 space-y-3">
            {(data?.funnel || []).length === 0 && !loading ? (
              <p className="text-sm text-neutral-500">Bu dönemde sipariş yok.</p>
            ) : null}
            {(data?.funnel || []).map((row) => (
              <div key={row.status}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">{row.label}</span>
                  <span className="tabular-nums text-neutral-500">
                    {row.count} · %{row.sharePercent}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.min(100, row.sharePercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="flex items-center gap-2 font-bold text-asta-navy">
            <Users className="h-5 w-5 text-brand" strokeWidth={1.75} />
            Müşteri dağılımı
          </h3>
          <p className="mt-1 text-xs text-neutral-500">Ödemeli siparişler — yeni / geri dönen / misafir</p>
          <div className="mt-4 flex h-[200px] items-center justify-center">
            {!loading && customerPie.length === 0 ? (
              <p className="text-sm text-neutral-500">Veri yok.</p>
            ) : null}
            {loading ? (
              <p className="text-sm text-neutral-500">Yükleniyor…</p>
            ) : customerPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={customerPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={76} paddingAngle={2}>
                    {customerPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} sipariş`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          {data?.customerMix ? (
            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-4 text-center text-xs">
              <div>
                <p className="font-bold text-asta-navy">{data.customerMix.newOrders}</p>
                <p className="text-neutral-500">Yeni</p>
              </div>
              <div>
                <p className="font-bold text-asta-navy">{data.customerMix.returningOrders}</p>
                <p className="text-neutral-500">Geri dönen</p>
              </div>
              <div>
                <p className="font-bold text-asta-navy">{data.customerMix.guestOrders}</p>
                <p className="text-neutral-500">Misafir</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-asta-navy">En çok satanlar</h3>
            <div className="flex gap-1 rounded-full border border-neutral-200 p-0.5">
              <button
                type="button"
                onClick={() => setTopSellerMode('revenue')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  topSellerMode === 'revenue' ? 'bg-brand text-white' : 'text-neutral-600'
                }`}
              >
                Ciroya göre
              </button>
              <button
                type="button"
                onClick={() => setTopSellerMode('qty')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  topSellerMode === 'qty' ? 'bg-brand text-white' : 'text-neutral-600'
                }`}
              >
                Adete göre
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {topSellers.length === 0 && !loading ? (
              <p className="text-sm text-neutral-500">Veri yok.</p>
            ) : null}
            {topSellers.slice(0, 8).map((p, idx) => {
              const imgPath = pickProductImagePath(p.image ? [p.image] : p.images);
              return (
                <div key={p.id || idx} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3">
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-neutral-400">{idx + 1}</span>
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {imgPath ? (
                      <img alt="" className="h-full w-full object-contain p-1" src={mediaUrl(imgPath)} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">—</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">{p.name}</p>
                    <p className="text-xs text-neutral-500">
                      {p.salesCount} adet · {formatTRY(p.totalRevenue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4">
            <h3 className="flex items-center gap-2 font-bold text-asta-navy">
              <AlertTriangle className="h-5 w-5 text-brand" strokeWidth={1.75} />
              Düşük stok
            </h3>
            <span className="text-xs text-neutral-500">
              Eşik ≤ {store?.lowStockThreshold ?? '—'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-neutral-100">
                {(store?.lowStockProducts || []).length === 0 && !loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-10 text-center text-neutral-500">
                      Düşük stok uyarısı yok.
                    </td>
                  </tr>
                ) : null}
                {(store?.lowStockProducts || []).map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/80">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
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
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-900">{p.name}</p>
                          <p className="text-xs text-neutral-500">{p.brand || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold tabular-nums text-rose-800 ring-1 ring-rose-200">
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(data?.couponStats?.topCoupons || []).length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="flex items-center gap-2 font-bold text-asta-navy">
            <TicketPercent className="h-5 w-5 text-brand" strokeWidth={1.75} />
            Öne çıkan kuponlar
          </h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {data.couponStats.topCoupons.slice(0, 5).map((c) => (
              <div key={c.code} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="font-mono text-sm font-bold text-brand">{c.code}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  {c.count} kullanım · {formatTRY(c.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
              {(data?.recentOrders || []).length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    Kayıt yok.
                  </td>
                </tr>
              ) : null}
              {(data?.recentOrders || []).map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-neutral-50/80">
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
                    {formatTrDateTime(o.createdAt)}
                  </td>
                </tr>
              ))}
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
