import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ADMIN_PRODUCT_SORT_OPTIONS } from './adminProductListFilters.js';

const selectClass =
  'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-brand focus:border-brand/50 focus:ring-2';

/** @param {{ label: string; children: import('react').ReactNode }} p */
function FilterSelect({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

/**
 * @param {{
 *   visibleCount: number;
 *   totalCount: number;
 *   sortKey: string;
 *   setSortKey: (v: string) => void;
 *   statusFilter: string;
 *   setStatusFilter: (v: string) => void;
 *   stockFilter: string;
 *   setStockFilter: (v: string) => void;
 *   discountFilter: string;
 *   setDiscountFilter: (v: string) => void;
 *   categoryFilter: string;
 *   setCategoryFilter: (v: string) => void;
 *   tagFilter: string;
 *   setTagFilter: (v: string) => void;
 *   contentFilter: string;
 *   setContentFilter: (v: string) => void;
 *   engagementFilter: string;
 *   setEngagementFilter: (v: string) => void;
 *   categoryOptions: string[];
 *   tagPresets: { value: string; label: string }[];
 *   onResetAll: () => void;
 *   filtersOnlyActive: boolean;
 *   sortActive: boolean;
 * }} props
 */
export default function AdminProductListToolbar({
  visibleCount,
  totalCount,
  sortKey,
  setSortKey,
  statusFilter,
  setStatusFilter,
  stockFilter,
  setStockFilter,
  discountFilter,
  setDiscountFilter,
  categoryFilter,
  setCategoryFilter,
  tagFilter,
  setTagFilter,
  contentFilter,
  setContentFilter,
  engagementFilter,
  setEngagementFilter,
  categoryOptions,
  tagPresets,
  onResetAll,
  filtersOnlyActive,
  sortActive,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== 'all') n += 1;
    if (stockFilter !== 'all') n += 1;
    if (discountFilter !== 'all') n += 1;
    if (categoryFilter !== 'all') n += 1;
    if (tagFilter !== 'all') n += 1;
    if (contentFilter !== 'all') n += 1;
    if (engagementFilter !== 'all') n += 1;
    return n;
  }, [
    statusFilter,
    stockFilter,
    discountFilter,
    categoryFilter,
    tagFilter,
    contentFilter,
    engagementFilter,
  ]);

  const sortLabel =
    ADMIN_PRODUCT_SORT_OPTIONS.find((o) => o.id === sortKey)?.label ?? 'Sıralama';

  const toggleFilters = () => {
    setFiltersOpen((o) => !o);
    if (!filtersOpen) setSortOpen(false);
  };

  const toggleSort = () => {
    setSortOpen((o) => !o);
    if (!sortOpen) setFiltersOpen(false);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <button
          type="button"
          onClick={toggleFilters}
          aria-expanded={filtersOpen}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
            filtersOpen || filtersOnlyActive
              ? 'border-brand/40 bg-brand-muted/50 text-brand'
              : 'border-neutral-200 bg-white text-asta-navy hover:bg-neutral-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
          Filtrele
          {activeFilterCount > 0 ? (
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={toggleSort}
          aria-expanded={sortOpen}
          className={`inline-flex max-w-[min(100%,14rem)] items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
            sortOpen || sortActive
              ? 'border-brand/40 bg-brand-muted/50 text-brand'
              : 'border-neutral-200 bg-white text-asta-navy hover:bg-neutral-50'
          }`}
        >
          <ArrowUpDown className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate normal-case">{sortActive ? sortLabel : 'Sırala'}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${sortOpen ? 'rotate-180' : ''}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>

        <p className="ml-auto text-sm text-neutral-600">
          <span className="font-semibold text-asta-navy">{visibleCount}</span>
          {totalCount !== visibleCount ? <> / {totalCount}</> : null} ürün
        </p>

        {(filtersOnlyActive || sortActive) && (
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-muted/40"
          >
            Sıfırla
          </button>
        )}
      </div>

      {filtersOpen ? (
        <div className="border-t border-neutral-100 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <FilterSelect label="Durum">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`mt-1.5 w-full ${selectClass}`}
              >
                <option value="all">Tümü</option>
                <option value="published">Yayında (stoklu)</option>
                <option value="inactive">Vitrinden gizli</option>
                <option value="auto_hidden">Stok bitti — otomatik gizli</option>
                <option value="out_of_stock">Stok yok</option>
              </select>
            </FilterSelect>

            <FilterSelect label="Stok">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className={`mt-1.5 w-full ${selectClass}`}
              >
                <option value="all">Tümü</option>
                <option value="low">Düşük stok (≤5)</option>
                <option value="zero">Sıfır stok</option>
              </select>
            </FilterSelect>

            <FilterSelect label="İndirim">
              <select
                value={discountFilter}
                onChange={(e) => setDiscountFilter(e.target.value)}
                className={`mt-1.5 w-full ${selectClass}`}
              >
                <option value="all">Tümü</option>
                <option value="on_sale">İndirimde (aktif fiyat)</option>
                <option value="scheduled_active">Planlı indirim — şu an aktif</option>
                <option value="scheduled_future">Planlı indirim — gelecek</option>
                <option value="none">İndirimsiz</option>
              </select>
            </FilterSelect>

            <FilterSelect label="Kategori">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`mt-1.5 w-full ${selectClass}`}
              >
                <option value="all">Tümü</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FilterSelect>

            <FilterSelect label="Etiket">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className={`mt-1.5 w-full ${selectClass}`}
              >
                <option value="all">Tümü</option>
                {tagPresets.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FilterSelect>

            <FilterSelect label="İçerik / SEO">
              <select
                value={contentFilter}
                onChange={(e) => setContentFilter(e.target.value)}
                className={`mt-1.5 w-full ${selectClass}`}
              >
                <option value="all">Tümü</option>
                <option value="no_image">Görsel yok</option>
                <option value="missing_seo">Slug veya SEO eksik</option>
                <option value="empty_description">Açıklama boş</option>
              </select>
            </FilterSelect>

            <FilterSelect label="Sepet ilgisi">
              <select
                value={engagementFilter}
                onChange={(e) => setEngagementFilter(e.target.value)}
                className={`mt-1.5 w-full ${selectClass}`}
              >
                <option value="all">Tümü</option>
                <option value="in_cart">Şu an sepette tutulan</option>
                <option value="cart_adds">Sepete en az 1 kez eklenmiş</option>
              </select>
            </FilterSelect>
          </div>
        </div>
      ) : null}

      {sortOpen ? (
        <div className="border-t border-neutral-100 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <FilterSelect label="Sıralama">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className={`mt-1.5 w-full max-w-md ${selectClass}`}
            >
              {ADMIN_PRODUCT_SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterSelect>
        </div>
      ) : null}
    </div>
  );
}
