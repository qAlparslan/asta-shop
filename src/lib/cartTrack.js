import { apiFetch } from '../api/client.js';
import { getOrCreateCartSessionId } from './cartSession.js';

/** @param {{ productId: string; variantId?: string | null }} payload */
export function trackCartAdd(payload) {
  const productId = String(payload?.productId || '').trim();
  if (!productId || typeof window === 'undefined') return;

  const sessionId = getOrCreateCartSessionId();
  if (!sessionId) return;

  apiFetch('/api/cart/track-add', {
    method: 'POST',
    body: {
      productId,
      variantId: payload.variantId ?? null,
      sessionId,
    },
  }).catch(() => {});
}

/** @param {string[]} productIds */
export function syncCartInterest(productIds) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateCartSessionId();
  if (!sessionId) return;

  apiFetch('/api/cart/sync', {
    method: 'POST',
    body: {
      sessionId,
      productIds: Array.isArray(productIds) ? productIds : [],
    },
  }).catch(() => {});
}
