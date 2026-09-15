const sanitizeHtml = require('sanitize-html');

/** Quill / zengin metin için makul HTML etiketleri (XSS’e kapalı). */
const RICH_ALLOWED_TAGS = [
    'p',
    'br',
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'span',
    'div',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'sub',
    'sup',
    'code',
    'pre',
];

/** Quill satır içi renk / vurgu — yalnızca güvenli değerler (url() yok). */
const STYLE_COLOR = [
    /^#[0-9a-fA-F]{3,8}$/,
    /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
    /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/,
];

const RICH_OPTIONS = {
    allowedTags: RICH_ALLOWED_TAGS,
    allowedAttributes: {
        a: ['href', 'target', 'rel', 'name'],
        img: ['src', 'alt', 'width', 'height', 'loading', 'class'],
        th: ['colspan', 'rowspan'],
        td: ['colspan', 'rowspan'],
        // Quill: bold/italik çoğunlukla etiketle; renk arka plan genelde style ile gelir
        '*': ['class', 'style'],
    },
    allowedStyles: {
        '*': {
            color: STYLE_COLOR,
            'background-color': STYLE_COLOR,
            // Quill vurgu bazen kısayol `background: rgb(...)` yazar
            background: STYLE_COLOR,
            'font-weight': [/^bold$/, /^bolder$/, /^normal$/, /^[1-9]00$/],
            'font-style': [/^italic$/, /^normal$/],
            'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
        },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
        img: ['http', 'https'],
    },
};

/** Rich text (Quill vb.) — XSS olmadan saklanabilir HTML. */
function sanitizeRichDescription(html) {
    if (html == null) return '';
    return sanitizeHtml(String(html), RICH_OPTIONS);
}

function escapeHtmlText(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** CSV / Excel düz metin açıklama → Quill uyumlu HTML (paragraflar, satır sonları, bölüm başlıkları). */
function plainTextDescriptionToHtml(text) {
    if (text == null) return '';
    const raw = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!raw.trim()) return '';
    if (/<\s*(p|br|strong|b|div|ul|ol|h[1-6]|span)\b/i.test(raw)) {
        return sanitizeRichDescription(raw);
    }

    const out = [];
    const blocks = raw.split(/\n\n+/);
    for (const block of blocks) {
        const lines = block.split('\n');
        for (const line of lines) {
            if (line.trim() === '') continue;
            const trimmed = line.trim();
            const isSectionLabel =
                /^[A-Za-zÇçĞğİıÖöŞşÜü0-9\s\-–—()+/%]+:\s*$/.test(trimmed) &&
                trimmed.length <= 80;
            if (isSectionLabel) {
                out.push(`<p><strong>${escapeHtmlText(trimmed)}</strong></p>`);
            } else {
                out.push(`<p>${escapeHtmlText(line)}</p>`);
            }
        }
    }
    return sanitizeRichDescription(out.join(''));
}

/** Meta açıklama gibi düz metin — HTML etiketlerini düşürür. */
function stripToPlainText(maybeHtml) {
    if (maybeHtml == null) return '';
    return sanitizeHtml(String(maybeHtml), {
        allowedTags: [],
        allowedAttributes: {},
    }).trim();
}

module.exports = { sanitizeRichDescription, stripToPlainText, plainTextDescriptionToHtml };
