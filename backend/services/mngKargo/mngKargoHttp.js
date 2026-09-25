const { getMngKargoConfig } = require('./mngKargoConfig');

/** @type {{ jwt: string; expiresAt: number } | null} */
let tokenState = null;

/**
 * Node fetch ağ/SSL hatalarında genelde yalnızca "fetch failed" döner; cause kodunu kullanıcıya taşı.
 * @param {string} label
 * @param {unknown} err
 */
function rethrowMngFetchError(label, err) {
    const e = err && typeof err === 'object' ? /** @type {Error & { cause?: unknown }} */ (err) : new Error(String(err));
    const base = String(e.message || 'fetch failed');
    const causes = [];
    let c = e.cause;
    while (c && typeof c === 'object') {
        const o = /** @type {{ code?: string; message?: string; cause?: unknown }} */ (c);
        const bit = [o.code, o.message].filter(Boolean).join(': ');
        if (bit) causes.push(bit);
        c = o.cause;
    }
    if (/fetch failed/i.test(base) || causes.length) {
        const cfg = getMngKargoConfig();
        const hint = causes.length ? causes.join(' → ') : base;
        throw new Error(
            `${label}: MNG sunucusuna bağlanılamadı (${cfg.baseUrl}). ` +
                `VPS/firewall HTTPS çıkışını ve MNG_API_BASE_URL değerini kontrol edin. Ayrıntı: ${hint}`,
        );
    }
    throw e;
}

/**
 * @param {string} url
 * @param {RequestInit} init
 */
async function mngFetch(url, init) {
    try {
        return await fetch(url, init);
    } catch (err) {
        rethrowMngFetchError('MNG HTTP', err);
    }
}

function parseMngExpireDate(str) {
    const s = String(str || '').trim();
    const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(s);
    if (!m) return Date.now() + 7 * 60 * 60 * 1000;
    const [, dd, mm, yyyy, hh, min, sec] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(sec)).getTime();
}

async function getMngJwt() {
    const now = Date.now();
    if (tokenState && tokenState.expiresAt > now + 60_000) {
        return tokenState.jwt;
    }
    const cfg = getMngKargoConfig();
    const customerNumber = cfg.customerNumber;
    const res = await mngFetch(`${cfg.baseUrl}/mngapi/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-IBM-Client-Id': cfg.clientId,
            'X-IBM-Client-Secret': cfg.clientSecret,
        },
        body: JSON.stringify({
            customerNumber: /^\d+$/.test(String(customerNumber)) ? Number(customerNumber) : customerNumber,
            password: cfg.customerPassword,
            identityType: 1,
        }),
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`MNG token yanıtı JSON değil (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
        const detail = data?.detail || data?.title || text.slice(0, 200);
        throw new Error(`MNG token alınamadı (${res.status}): ${detail}`);
    }
    const jwt = data.jwt || data.Jwt;
    if (!jwt) throw new Error('MNG token yanıtında jwt yok.');
    tokenState = {
        jwt,
        expiresAt: parseMngExpireDate(data.jwtExpireDate || data.JwtExpireDate),
    };
    return jwt;
}

/**
 * @param {{
 *   method: string;
 *   path: string;
 *   body?: unknown;
 *   auth?: boolean;
 * }} opts
 */
async function mngApiRequest(opts) {
    const cfg = getMngKargoConfig();
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-IBM-Client-Id': cfg.clientId,
        'X-IBM-Client-Secret': cfg.clientSecret,
    };
    if (opts.auth !== false) {
        headers.Authorization = `Bearer ${await getMngJwt()}`;
    }
    const res = await mngFetch(`${cfg.baseUrl}${opts.path}`, {
        method: opts.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }
    if (!res.ok) {
        const detail =
            (data && typeof data === 'object' && (data.detail || data.title || data.message)) ||
            (typeof data === 'string' ? data : text.slice(0, 300));
        throw new Error(`MNG API ${opts.method} ${opts.path} → ${res.status}: ${detail}`);
    }
    return data;
}

function clearMngTokenCache() {
    tokenState = null;
}

module.exports = { mngApiRequest, getMngJwt, clearMngTokenCache };
