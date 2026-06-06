import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { apiFetch } from '../api/client.js';

const REASON_LABELS = {
  token_yok: 'Ödeme oturumu doğrulanamadı.',
  sorgu_hatasi: 'Ödeme sağlayıcısı ile iletişim kurulamadı.',
  imza_gecersiz: 'Güvenlik doğrulaması başarısız. Lütfen destek ile iletişime geçin.',
  siparis_bulunamadi: 'Sipariş kaydı bulunamadı.',
  siparis_gecersiz: 'Sipariş durumu ödeme için uygun değil.',
  islem_hatasi: 'Sunucu tarafında bir hata oluştu.',
  paytr_odeme_red: 'Ödeme tamamlanmadı veya iptal edildi.',
};

export default function PaymentFailurePage() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'bilinmiyor';
  const orderId = searchParams.get('orderId') || '';
  const msg = REASON_LABELS[reason] || `Ödeme tamamlanamadı (${reason}).`;

  useEffect(() => {
    const id = String(orderId || '').trim();
    if (!id) return;
    apiFetch('/api/payments/cancel-pending', {
      method: 'POST',
      body: { orderId: id },
    }).catch(() => {});
  }, [orderId]);

  return (
    <section className="border-b border-neutral-100 bg-neutral-50/80 py-16 sm:py-20">
      <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-white px-8 py-12 shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <XCircle className="h-9 w-9" aria-hidden strokeWidth={1.5} />
          </div>
          <h1 className="mt-8 text-2xl font-bold text-asta-navy">Ödeme başarısız</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-600">{msg}</p>
          <p className="mx-auto mt-3 max-w-sm text-xs text-neutral-500">
            Sepetiniz korunur; tekrar deneyebilir veya farklı bir kart kullanabilirsiniz. Ödeme yapılmayan
            siparişler otomatik iptal edilir ve stok geri yüklenir.
          </p>
          <Link
            to="/odeme"
            className="mt-10 inline-flex w-full items-center justify-center rounded-md bg-brand py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover sm:w-auto sm:min-w-[200px] sm:px-10"
          >
            Ödemeye dön
          </Link>
          <Link
            to="/sepet"
            className="mt-4 inline-block text-sm font-semibold text-neutral-700 underline-offset-4 hover:text-brand hover:underline"
          >
            Sepete git
          </Link>
        </div>
      </div>
    </section>
  );
}
