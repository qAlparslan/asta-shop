const STORAGE_KEY = 'asta_visitor_key';

/**
 * Anonim ziyaretçi anahtarı — çerez onayı ve (isteğe bağlı) korelasyon için.
 * @returns {string | null}
 */
export function getOrCreateVisitorKey() {
  if (typeof window === 'undefined') return null;
  try {
    let k = window.localStorage.getItem(STORAGE_KEY);
    if (!k || k.length < 8) {
      k =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '')
          : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
      window.localStorage.setItem(STORAGE_KEY, k);
    }
    return k.slice(0, 64);
  } catch {
    return null;
  }
}
