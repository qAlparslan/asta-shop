/** @param {string} s */
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * index.html <head> içine title, meta, canonical ve JSON-LD enjekte eder.
 * @param {string} html
 * @param {{
 *   title?: string;
 *   description?: string;
 *   canonical?: string;
 *   ogType?: string;
 *   ogImage?: string;
 *   siteName?: string;
 *   robots?: string;
 *   jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
 * }} seo
 */
function injectHtmlSeo(html, seo) {
    let out = String(html || '');
    const title = String(seo.title || '').trim();
    const description = String(seo.description || '').trim();
    const canonical = String(seo.canonical || '').trim();
    const ogType = String(seo.ogType || 'website').trim();
    const ogImage = String(seo.ogImage || '').trim();
    const siteName = String(seo.siteName || '').trim();
    const robots = String(seo.robots || 'index, follow').trim();

    if (title) {
        out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    }

    const tags = [];
    if (description) {
        tags.push(`<meta name="description" content="${escapeHtml(description)}">`);
    }
    if (robots) {
        tags.push(`<meta name="robots" content="${escapeHtml(robots)}">`);
    }
    if (canonical) {
        tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`);
    }
    if (title) {
        tags.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
    }
    if (description) {
        tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
    }
    if (canonical) {
        tags.push(`<meta property="og:url" content="${escapeHtml(canonical)}">`);
    }
    if (ogType) {
        tags.push(`<meta property="og:type" content="${escapeHtml(ogType)}">`);
    }
    if (ogImage) {
        tags.push(`<meta property="og:image" content="${escapeHtml(ogImage)}">`);
    }
    if (siteName) {
        tags.push(`<meta property="og:site_name" content="${escapeHtml(siteName)}">`);
    }
    tags.push('<meta property="og:locale" content="tr_TR">');
    if (title) {
        tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}">`);
    }
    if (description) {
        tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}">`);
    }
    if (ogImage) {
        tags.push(`<meta name="twitter:image" content="${escapeHtml(ogImage)}">`);
    }
    tags.push('<meta name="twitter:card" content="summary_large_image">');

    if (seo.jsonLd) {
        const payload = Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd];
        for (const node of payload) {
            if (node && typeof node === 'object') {
                tags.push(
                    `<script type="application/ld+json">${JSON.stringify(node).replace(/</g, '\\u003c')}</script>`,
                );
            }
        }
    }

    if (tags.length) {
        out = out.replace(/<\/head>/i, `${tags.join('\n    ')}\n  </head>`);
    }

    return out;
}

module.exports = { injectHtmlSeo, escapeHtml };
