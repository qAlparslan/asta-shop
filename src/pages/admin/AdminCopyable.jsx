import { useState } from 'react';
import { Copy } from 'lucide-react';
import { copyToClipboard } from '../../lib/orderDisplayNumber.js';

/**
 * @param {{ text: string; className?: string; multiline?: boolean }} p
 */
export default function AdminCopyable({ text, className = '', multiline = false }) {
  const [copied, setCopied] = useState(false);
  const v = String(text || '').trim();
  if (!v || v === '—') {
    return <span className={className}>{v || '—'}</span>;
  }

  return (
    <span className={`inline-flex items-start gap-1 ${className}`}>
      <span className={`tabular-nums ${multiline ? 'whitespace-pre-wrap' : ''}`}>{v}</span>
      <button
        type="button"
        title="Kopyala"
        onClick={async () => {
          const ok = await copyToClipboard(v);
          if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand"
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {copied ? <span className="text-[10px] font-semibold text-brand">Kopyalandı</span> : null}
    </span>
  );
}

/**
 * @param {{ label: string; copyText?: string; children?: import('react').ReactNode; className?: string }} p
 */
export function AdminDetailField({ label, copyText, children, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-neutral-900">
        {children ?? <AdminCopyable text={copyText || '—'} />}
      </div>
    </div>
  );
}
