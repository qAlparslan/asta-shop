const { stripToPlainText } = require('./htmlSanitize');

const DEFAULT_SITE_LABEL = 'ASTA TİCARET';

/**
 * Yaklaşık kelime sonunda kısaltır (ellipsis).
 * @param {string} text
 * @param {number} max
 */
function trimAtBoundary(text, max) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    if (s.length <= max) return s;
    const cut = s.slice(0, Math.max(0, max - 1));
    const i = cut.lastIndexOf(' ');
    if (i >= Math.floor(max * 0.45)) return `${cut.slice(0, i).trim()}…`;
    return `${cut.trim()}…`;
}

/**
 * Ürün açıklamasından düz özet çıkarır.
 * @param {string} htmlOrText
 * @param {number} preferredMax
 */
function excerptPlain(htmlOrText, preferredMax) {
    let t = stripToPlainText(htmlOrText || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (t.length <= preferredMax) return t;

    let m = t.match(/^([\s\S]+?[.!?])(\s|$)/u);
    if (m && m[1].length <= preferredMax + 36) return m[1].trim();

    m = /(.+?[.!?])\s+/u.exec(t);
    if (m && m[1].length <= preferredMax + 40) return m[1].trim();

    return trimAtBoundary(t, preferredMax).replace(/…$/, '').trim().slice(0, preferredMax);
}

/** URL parçası (Türkçe harfleri ASCII'ye yaklaştırır). */
function slugifyPiece(raw, maxLen) {
    let s = stripToPlainText(raw || '');
    s = String(s || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
    return s.slice(0, maxLen || 200);
}

/**
 * Marka, ürün adı vb. kullanarak slug + meta paketi üretir.
 * Çakışmaları garanti etmek için `allocateUniqueSlug` controller'da yapılmalı.
 *
 * @param {{
 *   name: string;
 *   brand?: string | null;
 *   category?: string | null;
 *   description?: string | null;
 *   siteLabel?: string;
 * }} opts
 */
function generateProductSeo(opts) {
    const siteLabel = (opts.siteLabel && String(opts.siteLabel).trim()) || DEFAULT_SITE_LABEL;
    const name = stripToPlainText(opts.name || '').slice(0, 150).trim();
    const brand = stripToPlainText(opts.brand ?? '').slice(0, 100).trim();
    const category = stripToPlainText(opts.category ?? '').slice(0, 100).trim();

    const brandChunk = slugifyPiece(brand, 48);
    const nameChunk = slugifyPiece(name, 168);
    const slugParts = [brandChunk, nameChunk].filter(Boolean);
    let slug = slugParts.join('-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
    if (!slug) slug = slugifyPiece(name || brand || siteLabel, 200);
    slug = slug.slice(0, 220);

    // Meta başlık: ~52–58 karakter, marka/tekrar yüklemeden sıkı yazılır.
    let titleCore = name;
    if (brand && !name.toLocaleLowerCase('tr-TR').includes(brand.toLocaleLowerCase('tr-TR'))) {
        titleCore = `${brand} · ${name}`;
    }
    let metaTitle = trimAtBoundary(`${titleCore} · ${siteLabel}`, 58);

    let metaDesc = '';
    const ex = excerptPlain(opts.description || '', 138);
    if (ex) {
        metaDesc = `${ex} ${siteLabel}'te güvenli alışveriş.`;
    } else if (category) {
        metaDesc = `${name} — ${brand || siteLabel}: ${category} kategorisinde. ${siteLabel}'te güvenli alışveriş.`;
    } else if (brand) {
        metaDesc = `${name} (${brand}). ${siteLabel}'te orijinal ürün garantisi ile satın alın.`;
    } else {
        metaDesc = `${name}. ${siteLabel}'te güvenli alışveriş ve hızlı kargo.`;
    }
    metaDesc = trimAtBoundary(metaDesc.replace(/\s+/g, ' '), 158);

    return {
        slug,
        meta_title: metaTitle,
        meta_description: metaDesc,
    };
}

/**
 * Gövdede eksik olan SEO alanlarını (trim sonrası boş) tamamlar.
 * @param {Record<string, unknown>} data Sequelize create/update body'si — mutasyon.
 */
function applyMissingProductSeo(data) {
    const isEmpty = (k) => !String(data[k] ?? '').trim();

    const needSlug = isEmpty('slug');
    const needTitle = isEmpty('meta_title');
    const needDesc = isEmpty('meta_description');

    if (!needSlug && !needTitle && !needDesc) return;

    const g = generateProductSeo({
        name: typeof data.name === 'string' ? data.name : String(data.name || ''),
        brand: data.brand,
        category: data.category,
        description: typeof data.description === 'string' ? data.description : String(data.description || ''),
        siteLabel: DEFAULT_SITE_LABEL,
    });

    if (needSlug && g.slug) data.slug = g.slug;
    if (needTitle && g.meta_title) data.meta_title = g.meta_title;
    if (needDesc && g.meta_description) data.meta_description = g.meta_description;
}

module.exports = {
    DEFAULT_SITE_LABEL,
    generateProductSeo,
    applyMissingProductSeo,
    slugifyPiece,
};
