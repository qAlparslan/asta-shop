import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { apiFetch } from '../../api/client.js';

/**
 * @param {{
 *   orderId: string;
 *   hasInvoice: boolean;
 *   onSuccess: () => void;
 *   compact?: boolean;
 * }} p
 */
export default function AdminOrderInvoicePdfZone({ orderId, hasInvoice, onSuccess, compact = false }) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const uploadFile = async (file) => {
    if (!file) return;
    setError('');
    setFeedback('');
    const isPdf =
      file.type === 'application/pdf' || String(file.name || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Yalnızca PDF yükleyin.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Dosya en fazla 12 MB olabilir.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('invoice', file);
      await apiFetch(`/api/orders/${orderId}/invoice-pdf`, { method: 'POST', body: fd });
      setFeedback('Fatura yüklendi; müşteriye e-posta gönderildi.');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız.');
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
        >
          {busy ? 'Yükleniyor…' : hasInvoice ? 'E-arşiv faturayı güncelle' : 'E-arşiv fatura ekle'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(ev) => uploadFile(ev.target.files?.[0])}
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        {feedback ? <p className="mt-1 text-xs font-semibold text-emerald-700">{feedback}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-2 w-full">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') inputRef.current?.click();
        }}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(ev) => {
          ev.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(ev) => {
          ev.preventDefault();
          setDragOver(false);
          if (!busy) uploadFile(ev.dataTransfer.files?.[0]);
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-2 py-3 text-center transition-colors ${
          dragOver
            ? 'border-brand bg-brand-muted/40'
            : 'border-neutral-300 bg-neutral-50/80 hover:border-brand/40'
        } ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <FileUp className="mx-auto h-5 w-5 text-neutral-500" strokeWidth={1.75} aria-hidden />
        <p className="mt-1 text-[11px] font-semibold leading-snug text-neutral-800">
          {busy
            ? 'Yükleniyor ve e-posta gönderiliyor…'
            : hasInvoice
              ? 'Fatura PDF — yeniden yükle'
              : 'Fatura PDF sürükleyin veya seçin'}
        </p>
        <p className="mt-0.5 text-[10px] text-neutral-500">Müşteri e-postasına ek gönderilir</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(ev) => uploadFile(ev.target.files?.[0])}
      />
      {error ? <p className="mt-1 text-[10px] text-red-600">{error}</p> : null}
      {feedback ? <p className="mt-1 text-[10px] font-semibold text-emerald-700">{feedback}</p> : null}
    </div>
  );
}
