import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { apiFetch, downloadAuthorizedFile } from '../../api/client.js';
import AdminOrderMarketplaceRow, {
  AdminOrderMarketplaceHeader,
} from './AdminOrderMarketplaceRow.jsx';
import AdminOrdersFilterSortBar from './AdminOrdersFilterSortBar.jsx';
import {
  DEFAULT_ADMIN_ORDER_LIST_FILTERS,
  filterAndSortAdminOrders,
} from './adminOrderListFilters.js';
import { markOrderLabelPrinted } from '../../lib/adminOrderLabelPrinted.js';

/** @type {{ status: string; label: string; icon: import('lucide-react').LucideIcon }[]} */
const ORDER_WORKFLOW_TABS = [
  { status: 'hazirlaniyor', label: 'Gönderime Hazır', icon: Package },
  { status: 'kargolandi', label: 'Kargoda', icon: Truck },
  { status: 'teslim-edildi', label: 'Teslim Edildi', icon: CheckCircle2 },
];

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('hazirlaniyor');
  const [listFilters, setListFilters] = useState(() => ({ ...DEFAULT_ADMIN_ORDER_LIST_FILTERS }));
  const [sortKey, setSortKey] = useState('createdAt_desc');
  const [labelPrintedTick, setLabelPrintedTick] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiFetch('/api/orders')
      .then((res) => setOrders(Array.isArray(res?.data?.orders) ? res.data.orders : []))
      .catch((e) => setError(e.message || 'Liste alınamadı.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tabCounts = useMemo(() => {
    const counts = { hazirlaniyor: 0, kargolandi: 0, 'teslim-edildi': 0 };
    for (const o of orders) {
      const st = String(o.status || '');
      if (st in counts) counts[st] += 1;
    }
    return counts;
  }, [orders]);

  const tabOrders = useMemo(
    () => orders.filter((o) => o.status === activeTab),
    [orders, activeTab],
  );

  const filtered = useMemo(
    () =>
      filterAndSortAdminOrders(orders, {
        activeTab,
        query,
        filters: listFilters,
        sortKey,
      }),
    [orders, activeTab, query, listFilters, sortKey, labelPrintedTick],
  );

  const csvExport = async () => {
    setExporting(true);
    try {
      await downloadAuthorizedFile('/api/orders/export/csv');
    } catch (e) {
      setError(e.message || 'Dışa aktarma başarısız.');
    } finally {
      setExporting(false);
    }
  };

  /** @param {Record<string, unknown>} o @param {{ manage?: boolean } | undefined} opts */
  const openDetail = (o, opts) => {
    const suffix = opts?.manage ? '?yonetim=1' : '';
    navigate(`/admin/siparisler/${o.id}${suffix}`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-asta-navy">
          Sipariş yönetimi
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Gönderime hazır, kargoda ve teslim edilen siparişleri sekmelerden yönetin; detayda durum ve kargo kodunu
          güncelleyin.
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Sipariş durumu sekmeleri"
      >
        {ORDER_WORKFLOW_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.status;
          const count = tabCounts[tab.status] ?? 0;
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.status)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-neutral-200 bg-white text-asta-navy hover:border-brand/30 hover:bg-brand-muted/30'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {tab.label}
              <span
                className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <AdminOrdersFilterSortBar
        query={query}
        setQuery={setQuery}
        filters={listFilters}
        setFilters={setListFilters}
        sortKey={sortKey}
        setSortKey={setSortKey}
        onExportCsv={csvExport}
        exporting={exporting}
        loading={loading}
        resultCount={filtered.length}
        totalInTab={tabOrders.length}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <AdminOrderMarketplaceHeader />
        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-neutral-500">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-neutral-500">Kayıt yok.</p>
        ) : (
          <div className="min-w-[960px] overflow-x-auto">
            {filtered.map((o) => (
              <AdminOrderMarketplaceRow
                key={o.id}
                order={o}
                onDetail={openDetail}
                showInvoiceUpload={activeTab === 'teslim-edildi'}
                onInvoiceUploaded={load}
                onLabelPrinted={(id) => {
                  markOrderLabelPrinted(id);
                  setLabelPrintedTick((t) => t + 1);
                }}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
