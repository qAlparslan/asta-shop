import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const { clearCart } = useCart();

  useEffect(() => {
    if (orderId) clearCart();
  }, [orderId, clearCart]);

  return (
    <section className="border-b border-neutral-100 bg-neutral-50/80 py-16 sm:py-20">
      <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-12 shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted text-brand">
            <PartyPopper className="h-8 w-8" aria-hidden strokeWidth={1.5} />
          </div>
          <h1 className="mt-8 text-2xl font-bold text-asta-navy">Ödeme başarılı</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-600">
            {orderId ? (
              <>
                Sipariş numaranız:{' '}
                <span className="font-mono font-semibold text-neutral-900">{orderId}</span>. Siparişiniz
                hazırlanmaya alındı; onay e-postası gönderilebilir.
              </>
            ) : (
              <>Ödemeniz alındı. Sipariş durumunu hesabınızdan veya e-posta kutunuzdan takip edebilirsiniz.</>
            )}
          </p>
          <Link
            to="/"
            className="mt-10 inline-flex w-full items-center justify-center rounded-md bg-brand py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover sm:w-auto sm:min-w-[200px] sm:px-10"
          >
            Ana sayfaya dön
          </Link>
          <Link
            to="/urunler"
            className="mt-4 inline-block text-sm font-semibold text-neutral-700 underline-offset-4 hover:text-brand hover:underline"
          >
            Alışverişe devam et
          </Link>
        </div>
      </div>
    </section>
  );
}
