import { Check, Package, Truck } from 'lucide-react';
import { buildPublicTrackingUrl } from '../lib/trackingLink.js';

/** @param {string} status */
function stepState(status, stepIndex) {
  const order = ['hazirlaniyor', 'kargolandi', 'teslim-edildi'];
  const idx = order.indexOf(status);
  if (status === 'iptal-edildi' || status === 'odeme_bekleniyor') {
    return stepIndex === 0 ? 'active' : 'pending';
  }
  if (idx < 0) return 'pending';
  if (stepIndex < idx) return 'done';
  if (stepIndex === idx) return 'active';
  return 'pending';
}

const STEPS = [
  { label: 'Hazırlanıyor', icon: Package },
  { label: 'Kargoda', icon: Truck },
  { label: 'Teslim edildi', icon: Check },
];

/**
 * @param {{ status?: string; trackingNumber?: string | null; carrier?: string | null }} order
 */
export default function OrderTrackingStepper({ order }) {
  const status = String(order?.status || '');
  const trackingNo = String(order?.trackingNumber || '').trim();
  const trackUrl = buildPublicTrackingUrl(order?.carrier, trackingNo);

  if (status === 'iptal-edildi') {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-900 ring-1 ring-red-200">
        Bu sipariş iptal edildi.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((step, i) => {
          const state = stepState(status, i);
          const Icon = step.icon;
          const done = state === 'done';
          const active = state === 'active';
          return (
            <li key={step.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 sm:h-9 sm:w-9 ${
                  done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : active
                      ? 'border-brand bg-brand-muted text-brand'
                      : 'border-neutral-200 bg-white text-neutral-400'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </div>
              <span
                className={`text-center text-[10px] font-semibold leading-tight sm:text-[11px] ${
                  done || active ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {trackingNo && (status === 'kargolandi' || status === 'teslim-edildi') ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50/90 px-3 py-3 text-xs text-neutral-800">
          <p>
            <span className="font-semibold text-neutral-600">Kargo takip no:</span>{' '}
            <span className="font-mono font-bold text-asta-navy">{trackingNo}</span>
          </p>
          {trackUrl && status !== 'teslim-edildi' ? (
            <a
              href={trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-xs font-bold text-brand underline-offset-2 hover:underline"
            >
              Kargo firmasından takip et →
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
