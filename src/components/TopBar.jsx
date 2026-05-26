import { Link } from 'react-router-dom';
import { ShieldCheck, Package, User } from 'lucide-react';
import SocialLinksGroup from './SocialLinksGroup.jsx';

export default function TopBar() {
  return (
    <div className="border-b border-neutral-200 bg-asta-mutedBar text-asta-barText">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-[11px] sm:gap-4 sm:px-6 sm:text-xs lg:px-8">
        <div className="hidden shrink-0 lg:block lg:w-[100px]" aria-hidden />

        <div className="flex min-w-0 flex-1 flex-col items-center gap-y-2 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-1">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck
              className="h-3.5 w-3.5 shrink-0 text-asta-icon sm:h-4 sm:w-4"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="font-normal">%100 Orijinal Eucerin Ürünleri</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Package
              className="h-3.5 w-3.5 shrink-0 text-asta-icon sm:h-4 sm:w-4"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="font-normal">Aynı Gün Kargo (Hafta içi 14:00&apos;a kadar)</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 text-asta-icon sm:w-[140px] sm:justify-end sm:gap-4">
          <SocialLinksGroup
            wrapperClass="flex items-center gap-3 sm:gap-4"
            linkClass="transition-colors hover:text-asta-navy"
            iconClass="h-4 w-4"
          />
          <Link
            to="/hesabim"
            className="transition-colors hover:text-asta-navy"
            aria-label="Hesabım"
          >
            <User className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </div>
  );
}
