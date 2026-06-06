const SESSION_KEY = 'asta-cart-session-v1';

/** @returns {string} */
export function getOrCreateCartSessionId() {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && existing.trim()) return existing.trim();
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return '';
  }
}
