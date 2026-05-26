const { escapeHtml } = require('./emailTemplates/_utils');

/**
 * Kampanya/marketing içinde {{ad}}, {{siparis_no}} vb. yer tutucular.
 * Varsayılan: yerleştirilen değerler HTML kaçışlanır (`escapeFn`).
 */

const SAMPLE_VARS = Object.freeze({
    ad: 'Ayşe',
    tam_ad: 'Ayşe Yılmaz',
    eposta: 'ornekmail@firma.com',
    siparis_no: '#123456',
    siparis_tutari: '1.234,56 ₺',
    siparis_durumu: 'Kargoda',
    magaza_link: 'https://ornek-mağaza.example/magaza',
    magaza: 'Örnek Mağaza Adı',
    abonelik_iptali: 'https://ornek-mağaza.example/abonelikten-cik/…',
});

/** Yer tutucu adı → veri nesnesindeki canon anahtar */
const TOKEN_TO_KEY = Object.freeze({
    ad: 'ad',
    isim: 'ad',
    name: 'ad',
    firstname: 'ad',
    tam_ad: 'tam_ad',
    tamad: 'tam_ad',
    full_name: 'tam_ad',
    fullname: 'tam_ad',
    eposta: 'eposta',
    email: 'eposta',
    mail: 'eposta',
    siparis_no: 'siparis_no',
    siparisno: 'siparis_no',
    order_number: 'siparis_no',
    orderno: 'siparis_no',
    siparis_tutari: 'siparis_tutari',
    siparistutari: 'siparis_tutari',
    order_total: 'siparis_tutari',
    siparis_durumu: 'siparis_durumu',
    siparisdurumu: 'siparis_durumu',
    order_status: 'siparis_durumu',
    magaza_link: 'magaza_link',
    magazalink: 'magaza_link',
    shop_url: 'magaza_link',
    store_url: 'magaza_link',
    magaza: 'magaza',
    magaza_adi: 'magaza',
    store: 'magaza',
    storename: 'magaza',
    abonelik_iptali: 'abonelik_iptali',
    abonelikiptali: 'abonelik_iptali',
    unsubscribe_url: 'abonelik_iptali',
    unsubscribe: 'abonelik_iptali',
    kupon_kodu: 'kupon_code',
    kuponcode: 'kupon_code',
    coupon_code: 'kupon_code',
});

function norm(s) {
    return String(s || '')
        .trim()
        .toLowerCase()
        .replace(/-/g, '_')
        .replace(/\s+/g, '_')
        .normalize('NFKD')
        .replace(/\p{Mn}/gu, '')
        .replace(/[^a-z0-9_]/gu, '');
}

function subjectSafe(s) {
    return String(s ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 998);
}

/**
 * @param {string|null|undefined} text
 * @param {Record<string,string>} vars
 * @param {{ escapeFn?: (v: string) => string }} [opts]
 */
function interpolate(text, vars, opts = {}) {
    const esc = typeof opts.escapeFn === 'function' ? opts.escapeFn : escapeHtml;
    const stack = vars && typeof vars === 'object' ? vars : {};
    const str = text == null ? '' : String(text);
    return str.replace(/\{\{\s*([^}{]+?)\s*\}\}/gu, (_, tok) => {
        const rawTok = String(tok).trim();
        const canon =
            TOKEN_TO_KEY[norm(rawTok)] ||
            norm(rawTok).replace(/^var_/u, '').replace(/^data\./iu, '');
        const raw =
            canon && Object.prototype.hasOwnProperty.call(stack, canon)
                ? stack[canon]
                : '';
        return esc(String(raw == null ? '' : raw));
    });
}

function buildMarketingVars({
    recipientName,
    email,
    storeName,
    frontendUrl,
    unsubscribeUrl,
    couponCode,
}) {
    const fe = String(frontendUrl || '').replace(/\/$/, '');
    const nm = recipientName ? String(recipientName).trim() : '';
    const parts = nm.split(/\s+/).filter(Boolean);
    const ad = parts[0] || 'Merhaba';
    const tam_ad = nm || ad;
    return {
        ad,
        tam_ad,
        eposta: String(email || '').toLowerCase(),
        siparis_no: '',
        siparis_tutari: '',
        siparis_durumu: '',
        magaza_link: fe,
        magaza: String(storeName || '').trim(),
        abonelik_iptali: String(unsubscribeUrl || ''),
        kupon_code: couponCode ? String(couponCode) : '',
    };
}

module.exports = {
    interpolate,
    SAMPLE_VARS,
    buildMarketingVars,
    subjectSafe,
};
