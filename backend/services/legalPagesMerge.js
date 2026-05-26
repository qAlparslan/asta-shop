const SiteSetting = require('../models/SiteSetting');
const legal = require('../config/legalVersions');
const { bySlug: defaultBySlug } = require('../config/legalDocuments');

const SETTING_KEY = 'legalDocumentsJson';

const SLUG_ORDER = [
    'gizlilik',
    'kvkk',
    'cerez',
    'kullanim',
    'on-bilgilendirme',
    'mesafeli-satis',
    'iade',
];

/** @returns {Promise<Record<string, object>>} */
async function loadStoredPagesObject() {
    try {
        const row = await SiteSetting.findByPk(SETTING_KEY);
        const raw = row?.value ? String(row.value).trim() : '';
        if (!raw) return {};
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return {};
        }
        if (!parsed || typeof parsed !== 'object') return {};
        if (parsed.pages && typeof parsed.pages === 'object' && !Array.isArray(parsed.pages)) {
            return /** @type {Record<string, object>} */ (parsed.pages);
        }
        /** @type {Record<string, object>} */
        const out = {};
        for (const slug of SLUG_ORDER) {
            if (parsed[slug]) out[slug] = parsed[slug];
        }
        return out;
    } catch {
        return {};
    }
}

function deepSections(sections) {
    return JSON.parse(JSON.stringify(sections || []));
}

/**
 * Tek sayfa birleştirme: kayıtta yok veya eksikte kod varsayılanı.
 * @param {string} slug
 * @param {Record<string, object>} storedPages
 */
function mergeLegalPage(slug, storedPages) {
    const base = defaultBySlug[slug];
    if (!base) return null;

    const o = storedPages && typeof storedPages[slug] === 'object' ? storedPages[slug] : null;

    const titleOk = o && typeof o.title === 'string' && o.title.trim().length > 0;
    const title = titleOk ? o.title.trim().slice(0, 200) : base.title;

    const verOk = o && typeof o.version === 'string' && o.version.trim().length > 0;
    const version = verOk ? o.version.trim().slice(0, 40) : base.version;

    let sections = deepSections(base.sections);
    if (o && Array.isArray(o.sections) && o.sections.length > 0) {
        sections = sanitizeSectionsInput(o.sections, base);
    }

    const summaryOk = o && typeof o.summary === 'string' && o.summary.trim().length > 0;
    const summary = summaryOk ? o.summary.trim().slice(0, 1000) : base.summary;

    return {
        slug: base.slug,
        title,
        kind: base.kind,
        version,
        summary,
        sections,
    };
}

/**
 * @param {unknown[]} raw
 * @param {object} fallbackBase default doc
 */
function sanitizeSectionsInput(raw, fallbackBase) {
    /** @type {{ heading: string; paragraphs: string[] }[]} */
    const out = [];
    const maxSecs = 100;
    for (let i = 0; i < raw.length && i < maxSecs; i++) {
        const s = raw[i];
        if (!s || typeof s !== 'object') continue;
        const heading = typeof s.heading === 'string' ? s.heading.trim().slice(0, 400) : `Bölüm ${i + 1}`;
        const paras = [];
        const pSrc = Array.isArray(s.paragraphs) ? s.paragraphs : [];
        for (let j = 0; j < pSrc.length && j < 250; j++) {
            const t = typeof pSrc[j] === 'string' ? pSrc[j].trim().slice(0, 50000) : '';
            if (t) paras.push(t);
        }
        out.push({
            heading: heading || `Bölüm ${i + 1}`,
            paragraphs: paras.length ? paras : ['(Metin bekleniyor.)'],
        });
    }
    return out.length ? out : deepSections(fallbackBase.sections);
}

function validateAdminPayloadPages(pagesUnknown) {
    if (!pagesUnknown || typeof pagesUnknown !== 'object') {
        throw new Error('"pages" bir nesne olmalıdır.');
    }
    const pages = pagesUnknown.pages && typeof pagesUnknown.pages === 'object' ? pagesUnknown.pages : pagesUnknown;

    /** @type {Record<string, object>} */
    const clean = {};

    let totalChars = 0;
    const maxTotal = 600000;

    for (const slug of SLUG_ORDER) {
        if (!Object.prototype.hasOwnProperty.call(pages, slug)) {
            continue;
        }
        const p = pages[slug];
        if (!p || typeof p !== 'object') {
            throw new Error(`${slug}: geçersiz içerik.`);
        }
        const merged = mergeLegalPage(slug, { [slug]: p });
        if (!merged) continue;
        const json = JSON.stringify(merged);
        totalChars += json.length;
        if (totalChars > maxTotal) {
            throw new Error('Toplam içerik boyutu çok büyük. Kısaltıp tekrar deneyin.');
        }
        clean[slug] = {
            title: merged.title,
            version: merged.version,
            sections: merged.sections,
            summary: merged.summary,
        };
    }

    const missingSlug = SLUG_ORDER.find((s) => !clean[s]);
    if (missingSlug) {
        throw new Error(`Eksik belge anahtarı: ${missingSlug} — kayıtta tüm yasal sayfalar gönderilmelidir.`);
    }

    return { pages: clean };
}

async function persistPages(pagesObj) {
    const payload = JSON.stringify({ pages: pagesObj, savedAt: new Date().toISOString() });
    if (payload.length > 800000) {
        throw new Error('Veritabanı için içerik çok uzun.');
    }
    await SiteSetting.upsert({
        key: SETTING_KEY,
        value: payload,
        type: 'string',
    });
}

async function mergeAllPagesForApi() {
    const stored = await loadStoredPagesObject();
    /** @type {Record<string, NonNullable<ReturnType<typeof mergeLegalPage>>>} */
    const out = {};
    for (const slug of SLUG_ORDER) {
        const m = mergeLegalPage(slug, stored);
        if (m) out[slug] = m;
    }
    return out;
}

/**
 * Cayma/checkout/kayıtta kullanılacak güncel sürüm kodları (DB ile birleşik).
 */
function documentsListFromMerged(mergedOut) {
    return SLUG_ORDER.map((slug) => {
        const d = mergedOut[slug];
        return {
            slug,
            title: d.title,
            kind: d.kind,
            version: d.version,
            summary: d.summary,
        };
    });
}

function buildVersionsResponse(mergedOut) {
    return {
        privacyVersion: mergedOut.gizlilik.version,
        kvkkVersion: mergedOut.kvkk.version,
        cookiePolicyVersion: mergedOut.cerez.version,
        termsOfUseVersion: mergedOut.kullanim.version,
        preInfoSalesVersion: mergedOut['on-bilgilendirme'].version,
        distanceSalesVersion: mergedOut['mesafeli-satis'].version,
        returnsPolicyVersion: mergedOut.iade.version,
        summaries: {
            ...legal.summaries,
            privacy: mergedOut.gizlilik.summary,
            kvkk: mergedOut.kvkk.summary,
            cookies: mergedOut.cerez.summary,
            termsOfUse: mergedOut.kullanim.summary,
            preInfoSales: mergedOut['on-bilgilendirme'].summary,
            distanceSales: mergedOut['mesafeli-satis'].summary,
            returnsPolicy: mergedOut.iade.summary,
        },
        documents: documentsListFromMerged(mergedOut),
    };
}

async function getMergedVersionPins() {
    const merged = await mergeAllPagesForApi();
    return {
        privacyVersion: merged.gizlilik.version,
        kvkkVersion: merged.kvkk.version,
        cookiePolicyVersion: merged.cerez.version,
        termsOfUseVersion: merged.kullanim.version,
        preInfoSalesVersion: merged['on-bilgilendirme'].version,
        distanceSalesVersion: merged['mesafeli-satis'].version,
        returnsPolicyVersion: merged.iade.version,
    };
}

module.exports = {
    SETTING_KEY,
    SLUG_ORDER,
    loadStoredPagesObject,
    mergeLegalPage,
    validateAdminPayloadPages,
    persistPages,
    getMergedVersionPins,
    mergeAllPagesForApi,
    summariesStatic: legal.summaries,
    documentsListFromMerged,
    buildVersionsResponse,
};
