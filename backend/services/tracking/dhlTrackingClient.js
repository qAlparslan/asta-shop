const { isDeliveredTrackingStatus } = require('../../utils/trackingLink');

/**
 * DHL Shipment Tracking - Unified API client.
 * Tek header'lık kimlik doğrulama (`DHL-API-Key`); Express müşteri hesabına gerek yok.
 * Developer portal app'inin "Shipment Tracking - Unified" ürününe abone olması yeterli.
 */
function getDhlConfig() {
    const base =
        (process.env.DHL_API_BASE_URL || 'https://api-eu.dhl.com/track/shipments').replace(/\/$/, '');
    const apiKey = String(process.env.DHL_API_USERNAME || process.env.DHL_API_KEY || '').trim();
    const service = String(process.env.DHL_TRACKING_SERVICE || 'express').trim() || 'express';
    return { base, apiKey, service, enabled: Boolean(apiKey) };
}

/**
 * DHL takip sorgusu (Shipment Tracking - Unified).
 * @param {string} trackingNumber
 * @returns {Promise<{ ok: boolean; status: string | null; delivered: boolean; error?: string }>}
 */
async function queryDhlTracking(trackingNumber) {
    const no = String(trackingNumber || '').trim();
    if (!no) {
        return { ok: false, status: null, delivered: false, error: 'tracking_number_empty' };
    }

    const { base, apiKey, service, enabled } = getDhlConfig();
    if (!enabled) {
        return { ok: false, status: null, delivered: false, error: 'dhl_api_not_configured' };
    }

    const timeoutMs = Number(process.env.DHL_TRACKING_TIMEOUT_MS) || 20000;
    const params = new URLSearchParams({ trackingNumber: no });
    if (service) params.set('service', service);
    const url = `${base}?${params.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'DHL-API-Key': apiKey,
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
            if (process.env.DHL_DEBUG === 'true') {
                console.warn('[dhl-tracking] auth_failed', no, text?.slice(0, 200));
            }
            return { ok: false, status: null, delivered: false, error: 'dhl_auth_failed' };
        }
        if (res.status === 404) {
            return { ok: false, status: null, delivered: false, error: 'dhl_not_found' };
        }
        if (res.status === 429) {
            return { ok: false, status: null, delivered: false, error: 'dhl_rate_limited' };
        }
        if (!res.ok) {
            return {
                ok: false,
                status: null,
                delivered: false,
                error: `dhl_http_${res.status}`,
            };
        }

        const shipments = parsed?.shipments;
        const first = Array.isArray(shipments) ? shipments[0] : null;
        const statusObj = first?.status || null;

        // Yeni format: status objesi → { statusCode, status, description, timestamp }
        const statusCode = statusObj?.statusCode || null;
        const statusLabel =
            statusObj?.description ||
            statusObj?.status ||
            (Array.isArray(first?.events) && first.events.length
                ? first.events[0]?.description
                : null) ||
            statusCode ||
            null;

        const statusStr = statusLabel ? String(statusLabel) : null;
        const delivered =
            (statusCode && /^delivered$/i.test(String(statusCode))) ||
            isDeliveredTrackingStatus(statusStr);

        return {
            ok: true,
            status: statusStr,
            delivered: Boolean(delivered),
        };
    } catch (err) {
        const msg = err.name === 'AbortError' ? 'dhl_timeout' : err.message;
        if (process.env.DHL_DEBUG === 'true') {
            console.warn('[dhl-tracking]', no, msg);
        }
        return { ok: false, status: null, delivered: false, error: String(msg || 'dhl_request_failed') };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { queryDhlTracking, getDhlConfig };
