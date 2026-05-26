/**
 * MNG Kargo / DHL eCommerce TR — IBM API Connect REST client (Standard Query 1.0.0).
 *
 * İki katmanlı kimlik doğrulama:
 *   1) Platform/app: X-IBM-Client-Id + X-IBM-Client-Secret header'ları (sandbox.mngkargo / apizone.mngkargo'dan)
 *   2) Tüccar: customerNumber + password ile POST /mngapi/api/token → JWT (8 saat geçerli)
 *
 * Süreç:
 *   getMngToken()        → JWT (cache'li, 7 saat TTL)
 *   queryMngTracking()   → GET /standardqueryapi/getshipmentstatusBy{ShipmentId|ReferenceId}/{value}
 *
 * Sandbox host : https://testapi.mngkargo.com.tr
 * Canlı host   : https://api.mngkargo.com.tr
 */
const { isDeliveredTrackingStatus } = require('../../utils/trackingLink');

// In-memory JWT cache (process boyunca)
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function getMngConfig() {
    const base =
        (process.env.MNG_API_BASE_URL || process.env.DHL_API_BASE_URL || 'https://api.mngkargo.com.tr').replace(
            /\/$/,
            '',
        );
    const clientId = String(process.env.MNG_CLIENT_ID || process.env.DHL_API_USERNAME || '').trim();
    const clientSecret = String(process.env.MNG_CLIENT_SECRET || process.env.DHL_API_PASSWORD || '').trim();
    const customerNumber = String(process.env.MNG_CUSTOMER_NUMBER || '').trim();
    const password = String(process.env.MNG_PASSWORD || '').trim();
    const identityType = Number(process.env.MNG_IDENTITY_TYPE) || 1;
    return {
        base,
        clientId,
        clientSecret,
        customerNumber,
        password,
        identityType,
        enabled: Boolean(clientId && clientSecret && customerNumber && password),
    };
}

function isDebug() {
    return process.env.MNG_DEBUG === 'true' || process.env.DHL_DEBUG === 'true';
}

function resetTokenCache() {
    cachedToken = null;
    cachedTokenExpiresAt = 0;
}

async function fetchMngToken() {
    const { base, clientId, clientSecret, customerNumber, password, identityType } = getMngConfig();
    const url = `${base}/mngapi/api/token`;
    const body = {
        customerNumber: Number(customerNumber) || customerNumber,
        password,
        identityType,
    };

    const timeoutMs = Number(process.env.MNG_TRACKING_TIMEOUT_MS || process.env.DHL_TRACKING_TIMEOUT_MS) || 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'X-IBM-Client-Id': clientId,
                'X-IBM-Client-Secret': clientSecret,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        const text = await res.text();
        let parsed = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            /* */
        }

        if (!res.ok) {
            if (isDebug()) {
                console.warn(`[mng-token] HTTP ${res.status} → ${text?.slice(0, 300)}`);
            }
            const err = new Error(`mng_token_http_${res.status}`);
            err.status = res.status;
            err.body = text;
            throw err;
        }

        // MNG yanıtları bazen array sarmalı geliyor: [{ jwt: '...' }] vs { jwt: '...' }
        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        const jwt = data?.jwt || data?.token || data?.access_token || data?.accessToken;
        if (!jwt) {
            if (isDebug()) console.warn('[mng-token] yanıtta JWT bulunamadı:', text?.slice(0, 300));
            throw new Error('mng_token_missing_in_response');
        }
        return String(jwt);
    } finally {
        clearTimeout(timer);
    }
}

async function getMngToken() {
    const now = Date.now();
    if (cachedToken && cachedTokenExpiresAt > now + 60_000) {
        return cachedToken;
    }
    const jwt = await fetchMngToken();
    cachedToken = jwt;
    // MNG JWT 8 saat geçerli; 7 saat sonra yenile (1 saat güvenlik tamponu).
    cachedTokenExpiresAt = now + 7 * 60 * 60 * 1000;
    if (isDebug()) {
        console.log('[mng-tracking] yeni JWT alındı, 7 saat boyunca cache\'lendi.');
    }
    return jwt;
}

/**
 * Tek bir takip no için MNG/DHL eCommerce TR'den durum sorgusu.
 * @param {string} trackingNumber
 * @returns {Promise<{ ok: boolean; status: string | null; statusCode?: number | null; delivered: boolean; error?: string }>}
 */
async function queryMngTracking(trackingNumber) {
    const no = String(trackingNumber || '').trim();
    if (!no) {
        return { ok: false, status: null, delivered: false, error: 'tracking_number_empty' };
    }

    const cfg = getMngConfig();
    if (!cfg.enabled) {
        return { ok: false, status: null, delivered: false, error: 'mng_api_not_configured' };
    }

    let token;
    try {
        token = await getMngToken();
    } catch (err) {
        resetTokenCache();
        return { ok: false, status: null, delivered: false, error: 'mng_auth_failed' };
    }

    // Tümü rakamsa → ShipmentId (MNG'nin 12-haneli irsaliye no). Aksi takdirde referenceId.
    const byShipmentId = /^\d+$/.test(no);
    const path = byShipmentId
        ? `getshipmentstatusByShipmentId/${encodeURIComponent(no)}`
        : `getshipmentstatusByReferenceId/${encodeURIComponent(no)}`;
    const url = `${cfg.base}/mngapi/api/standardqueryapi/${path}`;

    const timeoutMs = Number(process.env.MNG_TRACKING_TIMEOUT_MS || process.env.DHL_TRACKING_TIMEOUT_MS) || 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'X-IBM-Client-Id': cfg.clientId,
                'X-IBM-Client-Secret': cfg.clientSecret,
                Accept: 'application/json',
            },
            signal: controller.signal,
        });

        const text = await res.text();
        let parsed = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            /* */
        }

        if (res.status === 401 || res.status === 403) {
            // Token süresi dolmuş olabilir → cache'i temizle, bir sonraki çağrı yeni JWT alır.
            resetTokenCache();
            if (isDebug()) {
                console.warn('[mng-tracking] auth_failed', no, text?.slice(0, 300));
            }
            return { ok: false, status: null, delivered: false, error: 'mng_auth_failed' };
        }
        if (res.status === 404) {
            return { ok: false, status: null, delivered: false, error: 'mng_not_found' };
        }
        if (res.status === 429) {
            return { ok: false, status: null, delivered: false, error: 'mng_rate_limited' };
        }
        if (!res.ok) {
            if (isDebug()) {
                console.warn(`[mng-tracking] HTTP ${res.status} → ${text?.slice(0, 200)}`);
            }
            return { ok: false, status: null, delivered: false, error: `mng_http_${res.status}` };
        }

        // MNG bazen `[{...}]`, bazen `{...}` döner. İlk elemana indir.
        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        const rawCode = data?.shipmentStatusCode ?? data?.statusCode ?? null;
        const statusCode = rawCode != null && rawCode !== '' ? Number(rawCode) : null;
        const statusDesc =
            data?.shipmentStatus ||
            data?.shipmentStatusDescription ||
            data?.statusDescription ||
            data?.description ||
            null;

        const statusStr = statusDesc || (statusCode != null ? `MNG-${statusCode}` : null);

        // MNG status code 5 = "Teslim Edildi"
        const delivered =
            statusCode === 5 ||
            (statusStr && /teslim\s*edildi/i.test(String(statusStr))) ||
            isDeliveredTrackingStatus(statusStr);

        if (isDebug()) {
            console.log(`[mng-tracking] no=${no} code=${statusCode} desc=${statusStr}`);
        }

        return {
            ok: true,
            status: statusStr ? String(statusStr) : null,
            statusCode,
            delivered: Boolean(delivered),
        };
    } catch (err) {
        const msg = err.name === 'AbortError' ? 'mng_timeout' : err.message;
        if (isDebug()) {
            console.warn('[mng-tracking]', no, msg);
        }
        return { ok: false, status: null, delivered: false, error: String(msg || 'mng_request_failed') };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = {
    queryMngTracking,
    getMngConfig,
    resetTokenCache,
    // Geriye dönük takma adlar — eski koddaki dhl* referansları kırılmasın diye.
    queryDhlTracking: queryMngTracking,
    getDhlConfig: getMngConfig,
};
