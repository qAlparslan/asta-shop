import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Download,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ADMIN_ORDER_SORT_OPTIONS,
  countActiveAdminOrderFilters,
  DEFAULT_ADMIN_ORDER_LIST_FILTERS,
} from './adminOrderListFilters.js';

/** @param {{ title: string; open: boolean; onToggle: () => void; children: import('react').ReactNode }} p */
function FilterSection({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-brand"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? '-rotate-180' : ''}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? <div className="space-y-2 px-4 pb-4">{children}</div> : null}
    </div>
  );
}

/** @param {{ checked: boolean; onChange: (v: boolean) => void; label: string }} p */
function FilterCheck({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-neutral-300 text-brand focus:ring-brand"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

/**
 * @param {{
 *   query: string;
 *   setQuery: (v: string) => void;
 *   filters: import('./adminOrderListFilters.js').AdminOrderListFilters;
 *   setFilters: (v: import('./adminOrderListFilters.js').AdminOrderListFilters) => void;
 *   sortKey: string;
 *   setSortKey: (v: string) => void;
 *   onExportCsv: () => void;
 *   exporting: boolean;
 *   loading: boolean;
 *   resultCount: number;
 *   totalInTab: number;
 * }} props
 */
export default function AdminOrdersFilterSortBar({
  query,
  setQuery,
  filters,
  setFilters,
  sortKey,
  setSortKey,
  onExportCsv,
  exporting,
  loading,
  resultCount,
  totalInTab,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const [secInvoice, setSecInvoice] = useState(true);
  const [secLabel, setSecLabel] = useState(true);
  const [secCustomer, setSecCustomer] = useState(true);
  const [secDate, setSecDate] = useState(true);

  const activeFilterCount = countActiveAdminOrderFilters(filters);
  const sortLabel =
    ADMIN_ORDER_SORT_OPTIONS.find((o) => o.id === sortKey)?.label ?? 'Sırala';

  useEffect(() => {
    if (!sortOpen) return undefined;
    const onDoc = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [sortOpen]);

  const patchFilter = (partial) => setFilters({ ...filters, ...partial });

  return (
    <>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              placeholder="Sipariş no, müşteri adı veya e-posta…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 outline-none ring-brand ring-offset-2 placeholder:text-neutral-400 focus:border-brand/40 focus:bg-white focus:ring-2"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <button
              type="button"
              onClick={() => {
                setFilterOpen(true);
                setSortOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
              Filtrele
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => {
                  setSortOpen((o) => !o);
                  setFilterOpen(false);
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm ${
                  sortOpen
                    ? 'border-brand/40 bg-brand-muted/40 text-brand'
                    : 'border-neutral-200 bg-white text-asta-navy hover:bg-neutral-50'
                }`}
              >
                <ArrowUpDown className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="max-w-[10rem] truncate">{sortKey !== 'createdAt_desc' ? sortLabel : 'Sırala'}</span>
                <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              </button>
              {sortOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-neutral-200 bg-white py-2 shadow-lg">
                  {ADMIN_ORDER_SORT_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSortKey(o.id);
                        setSortOpen(false);
                      }}
                      className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 ${
                        sortKey === o.id ? 'font-semibold text-brand' : 'text-neutral-800'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={exporting || loading}
              onClick={onExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-asta-navy shadow-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              İndir
            </button>
          </div>

          <p className="w-full text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:w-auto lg:text-right">
            {loading ? '…' : `${resultCount} sipariş`}
            {totalInTab !== resultCount ? ` (${totalInTab} sekmede)` : null}
          </p>
        </div>
      </div>

      {filterOpen ? (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/40"
          role="presentation"
          onClick={() => setFilterOpen(false)}
        >
          <aside
            className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            role="dialog"
            aria-label="Sipariş filtreleri"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="text-base font-bold text-asta-navy">Filtrele</h3>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <FilterSection
                title="Fatura durumu"
                open={secInvoice}
                onToggle={() => setSecInvoice((o) => !o)}
              >
                <FilterCheck
                  label="Faturası yüklenmemiş"
                  checked={filters.invoiceNotUploaded}
                  onChange={(v) => patchFilter({ invoiceNotUploaded: v })}
                />
              </FilterSection>

              <FilterSection
                title="Etiket durumu"
                open={secLabel}
                onToggle={() => setSecLabel((o) => !o)}
              >
                <FilterCheck
                  label="Etiketi yazdırılmış sipariş"
                  checked={filters.labelPrinted}
                  onChange={(v) => patchFilter({ labelPrinted: v })}
                />
                <FilterCheck
                  label="Etiketi yazdırılmamış sipariş"
                  checked={filters.labelNotPrinted}
                  onChange={(v) => patchFilter({ labelNotPrinted: v })}
                />
              </FilterSection>

              <FilterSection
                title="Müşteri tipi"
                open={secCustomer}
                onToggle={() => setSecCustomer((o) => !o)}
              >
                <FilterCheck
                  label="Bireysel müşteri"
                  checked={filters.customerIndividual}
                  onChange={(v) => patchFilter({ customerIndividual: v })}
                />
                <FilterCheck
                  label="Kurumsal müşteri"
                  checked={filters.customerCorporate}
                  onChange={(v) => patchFilter({ customerCorporate: v })}
                />
              </FilterSection>

              <FilterSection
                title="Sipariş tarihi"
                open={secDate}
                onToggle={() => setSecDate((o) => !o)}
              >
                <label className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2">
                  <Calendar className="h-4 w-4 text-neutral-400" strokeWidth={1.75} aria-hidden />
                  <input
                    type="date"
                    value={filters.orderDate}
                    onChange={(e) => patchFilter({ orderDate: e.target.value })}
                    className="w-full border-0 bg-transparent text-sm text-neutral-900 outline-none"
                  />
                </label>
                {filters.orderDate ? (
                  <button
                    type="button"
                    onClick={() => patchFilter({ orderDate: '' })}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Tarihi temizle
                  </button>
                ) : null}
              </FilterSection>
            </div>

            <div className="flex gap-2 border-t border-neutral-200 p-4">
              <button
                type="button"
                onClick={() => setFilters({ ...DEFAULT_ADMIN_ORDER_LIST_FILTERS })}
                className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Sıfırla
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
              >
                Uygula
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
