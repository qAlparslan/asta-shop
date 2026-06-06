import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { syncCartInterest, trackCartAdd } from '../lib/cartTrack.js';

const STORAGE_KEY = 'asta-cart-v2';

/**
 * @typedef {{
 *   lineId: string;
 *   productId: string;
 *   variantId: string | null;
 *   variantLabel: string | null;
 *   brand: string;
 *   name: string;
 *   price: number;
 *   image: string;
 *   quantity: number;
 * }} CartLine
 */

/** @returns {CartLine[]} */
function readStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return tryMigrateLegacyV1();
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeRow).filter(Boolean);
  } catch {
    return [];
  }
}

/** Eski asta-cart-v1 → tek satır = ürün id, varyant yok */
function tryMigrateLegacyV1() {
  try {
    const legacy = window.localStorage.getItem('asta-cart-v1');
    if (!legacy) return [];
    const data = JSON.parse(legacy);
    if (!Array.isArray(data)) return [];
    return data
      .map((row) =>
        normalizeRow({
          productId: row?.id,
          variantId: null,
          variantLabel: null,
          brand: typeof row?.brand === 'string' ? row.brand : '',
          name: row?.name,
          price: row?.price,
          image: typeof row?.image === 'string' ? row.image : '',
          quantity: row?.quantity,
        }),
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** @param {Record<string, unknown>} row */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;
  const pid = typeof row.productId === 'string' ? row.productId : typeof row.id === 'string' ? row.id : '';
  const variantRaw = row.variantId;
  const variantId =
    variantRaw === null ||
    variantRaw === undefined ||
    variantRaw === '' ||
    variantRaw === 'null'
      ? null
      : String(variantRaw);
  const name = typeof row.name === 'string' ? row.name : '';
  if (!pid || !name) return null;
  const q = Math.floor(Number(row.quantity));
  const price = Number(row.price);
  if (!Number.isFinite(q) || q < 1) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  const lineId = `${pid}__${variantId ?? ''}`;
  const variantLabel =
    row.variantLabel === null ||
    row.variantLabel === undefined ||
    row.variantLabel === ''
      ? null
      : String(row.variantLabel);
  return {
    lineId,
    productId: pid,
    variantId,
    variantLabel,
    brand: typeof row.brand === 'string' ? row.brand : '',
    name,
    price,
    image: typeof row.image === 'string' ? row.image : '',
    quantity: Math.min(99, Math.max(1, q)),
  };
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [lines, setLines] = useState(readStorage);
  /** @type {[null | { line: CartLine; at: number }, Function]} */
  const [lastAdded, setLastAdded] = useState(null);

  const syncTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      syncCartInterest(lines.map((l) => l.productId));
    }, 400);
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [lines]);

  /**
   * @param {{
   *   productId: string;
   *   brand: string;
   *   name: string;
   *   variantId?: string | null;
   *   variantLabel?: string | null;
   *   price: number;
   *   image: string;
   * }} payload
   */
  const addItem = useCallback((payload) => {
    const normalized = normalizeRow({
      ...payload,
      quantity: 1,
    });
    if (!normalized) return;
    setLines((prev) => {
      const i = prev.findIndex((l) => l.lineId === normalized.lineId);
      if (i === -1) return [...prev, normalized];
      const next = [...prev];
      next[i] = {
        ...normalized,
        quantity: Math.min(99, next[i].quantity + 1),
      };
      return next;
    });
    setLastAdded({ line: normalized, at: Date.now() });
    trackCartAdd({
      productId: normalized.productId,
      variantId: normalized.variantId,
    });
  }, []);

  const dismissLastAdded = useCallback(() => setLastAdded(null), []);

  const removeLine = useCallback((lineId) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const setQuantity = useCallback(
    (lineId, quantity) => {
      const q = Math.floor(Number(quantity));
      if (!Number.isFinite(q) || q < 1) {
        removeLine(lineId);
        return;
      }
      setLines((prev) =>
        prev.map((l) => (l.lineId === lineId ? { ...l, quantity: Math.min(99, q) } : l)),
      );
    },
    [removeLine],
  );

  const clearCart = useCallback(() => setLines([]), []);

  const totals = useMemo(() => {
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    return { itemCount, subtotal };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      addItem,
      removeLine,
      setQuantity,
      clearCart,
      itemCount: totals.itemCount,
      subtotal: totals.subtotal,
      lastAdded,
      dismissLastAdded,
    }),
    [
      lines,
      addItem,
      removeLine,
      setQuantity,
      clearCart,
      totals.itemCount,
      totals.subtotal,
      lastAdded,
      dismissLastAdded,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
