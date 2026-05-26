const { isDeliveredTrackingStatus } = require('../../utils/trackingLink');

function getDhlConfig() {
    const base =
        (process.env.DHL_API_BASE_URL || 'https://express.api.dhl.com/mydhlapi/test').replace(/\/$/, '');
    const username = String(process.env.DHL_API_USERNAME || '').trim();
    const password = String(process.env.DHL_API_PASSWORD || '').trim();
    return { base, username, password, enabled: Boolean(username && password) };
}

/**
 * DHL Express MyDHL+ tracking sorgusu.
 * @param {string} trackingNumber
 * @returns {Promise<{ ok: boolean; status: string | null; delivered: boolean; error?: string }>}
 */
async function queryDhlTracking(trackingNumber) {
    const no = String(trackingNumber || '').trim();
    if (!no) {
        return { ok: false, status: null, delivered: false, error: 'tracking_number_empty' };
    }

    const { base, username, password, enabled } = getDhlConfig();
    if (!enabled) {
        return { ok: false, status: null, delivered: false, error: 'dhl_api_not_configured' };
    }

    const timeoutMs = Number(process.env.DHL_TRACKING_TIMEOUT_MS) || 20000;
    const url = `${base}/tracking?shipmentTrackingNumber=${encodeURIComponent(no)}`;
    const auth = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${auth}`,
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
            return { ok: false, status: null, delivered: false, error: 'dhl_auth_failed' };
        }
        if (res.status === 404) {
            return { ok: false, status: null, delivered: false, error: 'dhl_not_found' };
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
        const status =
            first?.status ||
            first?.shipmentStatus ||
            (Array.isArray(first?.events) && first.events.length
                ? first.events[first.events.length - 1]?.description
                : null) ||
            null;

        const statusStr = status ? String(status) : null;
        return {
            ok: true,
            status: statusStr,
            delivered: isDeliveredTrackingStatus(statusStr),
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
