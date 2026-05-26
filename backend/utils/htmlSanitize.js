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

/** Meta açıklama gibi düz metin — HTML etiketlerini düşürür. */
function stripToPlainText(maybeHtml) {
    if (maybeHtml == null) return '';
    return sanitizeHtml(String(maybeHtml), {
        allowedTags: [],
        allowedAttributes: {},
    }).trim();
}

module.exports = { sanitizeRichDescription, stripToPlainText };
