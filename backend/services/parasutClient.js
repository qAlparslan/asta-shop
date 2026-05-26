/**
 * Paraşüt API v4 istemcisi — OAuth2 (password + refresh) ve JSON:API istekleri.
 * @see https://github.com/parasutcom/api-doc
 */

const DEFAULT_BASE = 'https://api.parasut.com/v4';
const TOKEN_URL = 'https://api.parasut.com/oauth/token';

let tokenState = {
    accessToken: null,
    refreshToken: process.env.PARASUT_REFRESH_TOKEN || null,
    expiresAt: 0,
};

function requireParasutConfig() {
    const clientId = (process.env.PARASUT_CLIENT_ID || '').trim();
    const clientSecret = (process.env.PARASUT_CLIENT_SECRET || '').trim();
    const username = (process.env.PARASUT_USERNAME || '').trim();
    const password = (process.env.PARASUT_PASSWORD || '').trim();
    const companyId = (process.env.PARASUT_COMPANY_ID || '').trim();
    if (!clientId || !clientSecret) {
        throw new Error('PARASUT_CLIENT_ID ve PARASUT_CLIENT_SECRET zorunludur.');
    }
    if (!username || !password) {
        throw new Error('PARASUT_USERNAME ve PARASUT_PASSWORD zorunludur.');
    }
    if (!companyId) {
        throw new Error('PARASUT_COMPANY_ID zorunludur.');
    }
    return {
        clientId,
        clientSecret,
        username,
        password,
        companyId,
        baseUrl: (process.env.PARASUT_API_BASE || DEFAULT_BASE).replace(/\/+$/, ''),
    };
}

async function postForm(bodyParams) {
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams(bodyParams),
    });
    const text = await res.text();
    let json = {};
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        /* */
    }
    if (!res.ok) {
        const msg = json.error_description || json.error || text || `HTTP ${res.status}`;
        throw new Error(`Paraşüt OAuth: ${msg}`);
    }
    return json;
}

async function fetchPasswordToken() {
    const cfg = requireParasutConfig();
    const json = await postForm({
        grant_type: 'password',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        username: cfg.username,
        password: cfg.password,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    });
    return applyTokenResponse(json);
}

async function fetchRefreshToken(refreshToken) {
    const cfg = requireParasutConfig();
    const json = await postForm({
        grant_type: 'refresh_token',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refreshToken,
    });
    return applyTokenResponse(json);
}

function applyTokenResponse(json) {
    const access = json.access_token;
    const refresh = json.refresh_token || tokenState.refreshToken;
    const ttl = Number(json.expires_in) || 7200;
    if (!access) throw new Error('Paraşüt OAuth yanıtında access_token yok.');
    tokenState = {
        accessToken: access,
        refreshToken: refresh,
        expiresAt: Date.now() + ttl * 1000,
    };
    return tokenState.accessToken;
}

/**
 * Geçerli access token döner (gerekirse yeniler).
 */
async function getAccessToken() {
    if (tokenState.accessToken && Date.now() < tokenState.expiresAt - 45_000) {
        return tokenState.accessToken;
    }
    if (tokenState.refreshToken) {
        try {
            return await fetchRefreshToken(tokenState.refreshToken);
        } catch {
            tokenState.refreshToken = null;
        }
    }
    return fetchPasswordToken();
}

function formatApiError(status, bodyText, parsed) {
    const errs = parsed?.errors;
    if (Array.isArray(errs) && errs.length) {
        return errs.map((e) => e.detail || e.title || JSON.stringify(e)).join('; ');
    }
    return bodyText || `HTTP ${status}`;
}

/**
 * @param {string} method
 * @param {string} path - "/{company_id}/..." veya company id ile başlayan göreli yol
 * @param {object|null} jsonBody
 */
async function apiRequest(method, path, jsonBody = null) {
    const cfg = requireParasutConfig();
    const token = await getAccessToken();
    const url = path.startsWith('http') ? path : `${cfg.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, application/vnd.api+json',
    };
    if (jsonBody != null) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
        method,
        headers,
        body: jsonBody != null ? JSON.stringify(jsonBody) : undefined,
    });
    const text = await res.text();
    let parsed = null;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        /* */
    }
    if (!res.ok) {
        throw new Error(formatApiError(res.status, text, parsed));
    }
    return parsed;
}

module.exports = {
    requireParasutConfig,
    getAccessToken,
    apiRequest,
    resetTokenCacheForTests() {
        tokenState = { accessToken: null, refreshToken: null, expiresAt: 0 };
    },
};
