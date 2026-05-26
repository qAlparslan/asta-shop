import {
  ShoppingBag,
  Heart,
  Check,
  ShieldCheck,
  RefreshCw,
  Headphones,
  ChevronDown,
  MailOpen,
} from 'lucide-react';

const stroke = 1.6;

/** Çanta + içte kalp (anasayfa güven şeridi) */
export function IconSecureBagHeart({ className = 'h-14 w-14' }) {
  return (
    <div className={`relative shrink-0 text-neutral-900 ${className}`}>
      <ShoppingBag className="h-full w-full" strokeWidth={stroke} aria-hidden />
      <Heart
        className="pointer-events-none absolute left-1/2 top-[54%] h-[32%] w-[32%] -translate-x-1/2 -translate-y-1/2 fill-none stroke-neutral-900"
        strokeWidth={2}
        aria-hidden
      />
    </div>
  );
}

/** Çanta içinde kırmızı onay işareti */
export function IconSecureShopping({ className = 'h-14 w-14' }) {
  return (
    <div className={`relative shrink-0 text-neutral-900 ${className}`}>
      <ShoppingBag className="h-full w-full" strokeWidth={stroke} aria-hidden />
      <Check
        className="pointer-events-none absolute left-1/2 top-[52%] h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 text-brand"
        strokeWidth={3}
        aria-hidden
      />
    </div>
  );
}

/** Kalkan + onay çizgileri */
export function IconOriginalShield({ className = 'h-14 w-14' }) {
  return <ShieldCheck className={`shrink-0 text-neutral-900 ${className}`} strokeWidth={stroke} aria-hidden />;
}

/** Döngüsel oklar — kolay iade */
export function IconEasyReturn({ className = 'h-14 w-14' }) {
  return <RefreshCw className={`shrink-0 text-neutral-900 ${className}`} strokeWidth={stroke} aria-hidden />;
}

/** Kulaklık — sade çizgi (anasayfa güven şeridi) */
export function IconHeadsetOutline({ className = 'h-14 w-14' }) {
  return <Headphones className={`shrink-0 text-neutral-900 ${className}`} strokeWidth={stroke} aria-hidden />;
}

/** Kulaklık + küçük chevron */
export function IconSupport247({ className = 'h-14 w-14' }) {
  return (
    <div className={`relative flex shrink-0 flex-col items-center text-neutral-900 ${className}`}>
      <Headphones className="h-[72%] w-full" strokeWidth={stroke} aria-hidden />
      <ChevronDown className="-mt-0.5 h-[22%] w-[22%] text-neutral-900" strokeWidth={2.5} aria-hidden />
    </div>
  );
}

/** Açık zarf + içte kırmızı mektup */
export function IconNewsletterEnvelope({ className = 'h-14 w-14' }) {
  return (
    <div className={`relative shrink-0 text-neutral-900 ${className}`}>
      <MailOpen className="h-full w-full" strokeWidth={stroke} aria-hidden />
      <span
        className="pointer-events-none absolute left-1/2 top-[46%] block h-[28%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-brand"
        aria-hidden
      />
    </div>
  );
}
