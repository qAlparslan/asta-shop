import { formatTRY } from '../lib/formatTRY.js';

/**
 * Ücretsiz kargo eşiğine göre ilerleme çubuğu + resmi açıklama.
 * @param {{
 *   threshold: number;
 *   qualifiedAmount: number;
 *   paysShippingCharge: boolean;
 *   freeShippingEnabled: boolean;
 *   shippingFeeEnabled: boolean;
 * }} props
 */
export default function FreeShippingProgress({
  threshold,
  qualifiedAmount,
  paysShippingCharge,
  freeShippingEnabled,
  shippingFeeEnabled,
}) {
  if (
    !freeShippingEnabled ||
    !shippingFeeEnabled ||
    !(Number(threshold) > 0) ||
    !(Number.isFinite(Number(qualifiedAmount)))
  ) {
    return null;
  }

  const th = Number(threshold);
  const q = Math.max(0, Number(qualifiedAmount));
  const pct = Math.min(100, Math.max(0, (q / th) * 100));
  const remaining = Math.max(0, th - q);

  if (!paysShippingCharge) {
    return (
      <div
        role="status"
        className="free-shipping-banner free-shipping-banner--qualified rounded-lg border px-4 py-4 text-sm leading-relaxed"
      >
        <p className="font-semibold">Tanımlı ücretsiz gönderim şartınız sağlanmıştır.</p>
        <p className="mt-1 text-xs opacity-90">
          Siparişinize yönelik nakliye bedeli tahsil edilmemektedir.
        </p>
      </div>
    );
  }

  return (
    <div className="free-shipping-banner free-shipping-banner--progress rounded-lg border px-4 py-4 text-sm leading-relaxed">
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        Ücretsiz gönderime ilişkin sepet durumu
      </p>
      <div className="free-shipping-bar-track mt-3 h-2.5 w-full overflow-hidden rounded-full ring-1">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand/85 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3">
        Ücretsiz gönderimin sağlanabilmesi için sepet ara toplamınızın (indirim uygulanmış tutar dahil){' '}
        <strong className="tabular-nums">{formatTRY(th)}</strong>
        ’yi geçmesi gerekmektedir. Güncel tutarınız{' '}
        <strong className="tabular-nums">{formatTRY(q)}</strong>&apos;dir.
        <span className="mt-2 block font-medium">
          Limitin dolması için en az{' '}
          <strong className="tabular-nums text-brand">{formatTRY(remaining)}</strong> tutarında ilave alışveriş
          yapmanız gerekmektedir.
        </span>
      </p>
    </div>
  );
}
