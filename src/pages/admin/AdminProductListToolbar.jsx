import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ADMIN_PRODUCT_SORT_OPTIONS } from './adminProductListFilters.js';

const pillBase =
  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1';
const pillIdle = 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50';
const pillActive = 'border-brand bg-brand text-white shadow-sm';

/** @param {{ active: boolean; onClick: () => void; children: import('react').ReactNode }} p */
function Pill({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`${pillBase} ${active ? pillActive : pillIdle}`}>
      {children}
    </button>
  );
}

/** @param {{ title: string; children: import('react').ReactNode }} p */
function FilterGroup({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
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
        <div className="space-y-4 border-t border-neutral-100 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <FilterGroup title="Durum">
            <Pill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
              Tümü
            </Pill>
            <Pill active={statusFilter === 'published'} onClick={() => setStatusFilter('published')}>
              Yayında
            </Pill>
            <Pill active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>
              Gizli
            </Pill>
            <Pill active={statusFilter === 'auto_hidden'} onClick={() => setStatusFilter('auto_hidden')}>
              Otom. gizli
            </Pill>
            <Pill active={statusFilter === 'out_of_stock'} onClick={() => setStatusFilter('out_of_stock')}>
              Stok yok
            </Pill>
          </FilterGroup>

          <FilterGroup title="Stok">
            <Pill active={stockFilter === 'all'} onClick={() => setStockFilter('all')}>
              Tümü
            </Pill>
            <Pill active={stockFilter === 'low'} onClick={() => setStockFilter('low')}>
              Düşük (≤5)
            </Pill>
            <Pill active={stockFilter === 'zero'} onClick={() => setStockFilter('zero')}>
              Sıfır
            </Pill>
          </FilterGroup>

          <FilterGroup title="İndirim">
            <Pill active={discountFilter === 'all'} onClick={() => setDiscountFilter('all')}>
              Tümü
            </Pill>
            <Pill active={discountFilter === 'on_sale'} onClick={() => setDiscountFilter('on_sale')}>
              İndirimde
            </Pill>
            <Pill
              active={discountFilter === 'scheduled_active'}
              onClick={() => setDiscountFilter('scheduled_active')}
            >
              Planlı — aktif
            </Pill>
            <Pill
              active={discountFilter === 'scheduled_future'}
              onClick={() => setDiscountFilter('scheduled_future')}
            >
              Planlı — gelecek
            </Pill>
            <Pill active={discountFilter === 'none'} onClick={() => setDiscountFilter('none')}>
              İndirimsiz
            </Pill>
          </FilterGroup>

          {categoryOptions.length > 0 ? (
            <FilterGroup title="Kategori">
              <Pill active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
                Tümü
              </Pill>
              {categoryOptions.map((c) => (
                <Pill key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>
                  {c}
                </Pill>
              ))}
            </FilterGroup>
          ) : null}

          <FilterGroup title="Etiket">
            <Pill active={tagFilter === 'all'} onClick={() => setTagFilter('all')}>
              Tümü
            </Pill>
            {tagPresets.map((t) => (
              <Pill key={t.value} active={tagFilter === t.value} onClick={() => setTagFilter(t.value)}>
                {t.label}
              </Pill>
            ))}
          </FilterGroup>

          <FilterGroup title="İçerik / SEO">
            <Pill active={contentFilter === 'all'} onClick={() => setContentFilter('all')}>
              Tümü
            </Pill>
            <Pill active={contentFilter === 'no_image'} onClick={() => setContentFilter('no_image')}>
              Görsel yok
            </Pill>
            <Pill active={contentFilter === 'missing_seo'} onClick={() => setContentFilter('missing_seo')}>
              SEO eksik
            </Pill>
            <Pill
              active={contentFilter === 'empty_description'}
              onClick={() => setContentFilter('empty_description')}
            >
              Açıklama boş
            </Pill>
          </FilterGroup>

          <FilterGroup title="Sepet">
            <Pill active={engagementFilter === 'all'} onClick={() => setEngagementFilter('all')}>
              Tümü
            </Pill>
            <Pill active={engagementFilter === 'in_cart'} onClick={() => setEngagementFilter('in_cart')}>
              Sepette tutulan
            </Pill>
            <Pill active={engagementFilter === 'cart_adds'} onClick={() => setEngagementFilter('cart_adds')}>
              Sepete eklenmiş
            </Pill>
          </FilterGroup>
        </div>
      ) : null}

      {sortOpen ? (
        <div className="border-t border-neutral-100 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Sıralama</p>
          <div className="flex flex-wrap gap-2">
            {ADMIN_PRODUCT_SORT_OPTIONS.map((o) => (
              <Pill key={o.id} active={sortKey === o.id} onClick={() => setSortKey(o.id)}>
                {o.label}
              </Pill>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
