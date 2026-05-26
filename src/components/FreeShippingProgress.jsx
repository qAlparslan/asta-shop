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
        className="rounded-lg border border-green-700/25 bg-green-50/90 px-4 py-4 text-sm leading-relaxed text-neutral-900"
      >
        <p className="font-medium text-neutral-900">
          Tanımlı ücretsiz gönderim şartınız sağlanmıştır.
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          Siparişinize yönelik nakliye bedeli tahsil edilmemektedir.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand/25 bg-brand-muted/50 px-4 py-4 text-sm leading-relaxed text-neutral-900">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-700">
        Ücretsiz gönderime ilişkin sepet durumu
      </p>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/90 ring-1 ring-brand/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand/85 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-neutral-800">
        Ücretsiz gönderimin sağlanabilmesi için sepet ara toplamınızın (indirim uygulanmış tutar dahil){' '}
        <strong className="tabular-nums">{formatTRY(th)}</strong>
        ’yi geçmesi gerekmektedir. Güncel tutarınız{' '}
        <strong className="tabular-nums">{formatTRY(q)}</strong>'dir.
        <span className="mt-2 block font-medium">
          Limitin dolması için en az{' '}
          <strong className="tabular-nums text-brand">{formatTRY(remaining)}</strong> tutarında ilave alışveriş
          yapmanız gerekmektedir.
        </span>
      </p>
    </div>
  );
}
