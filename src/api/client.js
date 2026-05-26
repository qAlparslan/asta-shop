const TOKEN_KEY = 'asta_token';
const TOKEN_SESSION_KEY = 'asta_token_sess';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_SESSION_KEY) || null
  );
}

/** @param {string | null} t */
export function setToken(t, { remember = true } = {}) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_SESSION_KEY);
  if (!t) return;
  if (remember) window.localStorage.setItem(TOKEN_KEY, t);
  else window.sessionStorage.setItem(TOKEN_SESSION_KEY, t);
}

export function clearToken() {
  setToken(null);
}

function apiOrigin() {
  const o = (import.meta.env.VITE_API_ORIGIN || '').trim().replace(/\/$/, '');
  return o;
}

/**
 * AbortController nedeniyle veya sayfa değişiminde iptal edilen istekleri ayırt eder.
 */
export function isAbortError(err) {
  if (!err || typeof err !== 'object') return false;
  if (err.name === 'AbortError') return true;
  if (typeof err.message === 'string' && /^aborted$/i.test(err.message.trim())) return true;
  const c = /** @type {{ name?: string }} */ (err.cause);
  if (c && c.name === 'AbortError') return true;
  return false;
}

/**
 * POST/GET vb. için merkezi fetch.
 * `@param path` göreli (`/api/...`) ya da tam URL olabilir.
 */
export async function apiFetch(path, options = {}) {
  const { body, skipAuth, parseJson = true, ...rest } = options;
  /** @type {Record<string,string>} */
  const headers = { ...(rest.headers || {}) };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = !skipAuth && getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const origin = apiOrigin();
  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${origin}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: origin ? 'omit' : 'same-origin',
    body:
      body === undefined || isFormData
        ? /** @type {BodyInit | undefined} */ (body)
        : JSON.stringify(body),
  });

  if (!parseJson) {
    if (!res.ok) throw new Error(res.statusText || 'İstek başarısız');
    return res;
  }

  const text = await res.text();
  /** @type {unknown} */
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    /** @type {{ message?: string }} */
    const d = typeof data === 'object' && data !== null ? data : {};
    const msg =
      typeof d.message === 'string' && d.message.trim()
        ? d.message
        : `İstek başarısız (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * İndirme (CSV vb.) — kimlik bilgisi ile; `Content-Disposition` dosya adından okunur.
 */
export async function downloadAuthorizedFile(path, fallbackName = 'indir.txt') {
  const res = await apiFetch(path, { parseJson: false });
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  let name = fallbackName;
  if (cd) {
    const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
    const raw = m ? decodeURIComponent(m[1] || m[2] || '') : '';
    if (raw) name = raw;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
