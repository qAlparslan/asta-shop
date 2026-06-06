const { escapeHtml, money } = require('./_utils');
const T = require('./emailTheme');

const AREA_LABELS = {
    yuz: 'Yüz',
    vucut: 'Vücut',
    goz: 'Göz',
    el: 'El',
    genel: 'Genel',
};

const PURPOSE_LABELS = {
    temizleyici: 'Temizleyici',
    nemlendirici: 'Nemlendirici',
    'anti-aging': 'Anti-aging',
    onarici: 'Onarıcı',
    diger: 'Diğer',
};

/**
 * @param {Record<string, unknown>} item
 */
function formatOrderItemMeta(item) {
    const parts = [];
    const variant = String(item.variantName || '').trim();
    if (variant) parts.push(variant);

    const areaKey = String(item.area || '').trim();
    if (areaKey && areaKey !== 'genel') {
        parts.push(AREA_LABELS[areaKey] || areaKey);
    }

    const purposeKey = String(item.purpose || '').trim();
    if (purposeKey && purposeKey !== 'diger') {
        parts.push(PURPOSE_LABELS[purposeKey] || purposeKey);
    }

    return parts.join(' · ');
}

/**
 * Sipariş satır tablosu (onay + admin).
 * @param {Array<{ name?: string; quantity?: number; price?: number; variantName?: string; area?: string; purpose?: string }>} items
 * @param {boolean} [withHeader]
 * @param {{ rich?: boolean }} [options]
 */
function renderOrderItemsTable(items, withHeader = true, options = {}) {
    const rich = options.rich === true;
    const rows = items
        .map((it) => {
            const qty = Number(it.quantity) || 0;
            const price = Number(it.price) || 0;
            const line = price * qty;
            const meta = rich ? formatOrderItemMeta(it) : '';
            const unitHint =
                rich && qty > 1
                    ? `<span style="color:${T.textMuted};font-size:12px;">${qty} × ${money(price)} ₺</span>`
                    : '';
            return `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid ${T.border};font-size:14px;color:${T.text};font-family:${T.fontSans};">
        <strong style="color:${T.navy};">${escapeHtml(it.name || 'Ürün')}</strong>
        ${meta ? `<div style="margin-top:4px;font-size:12px;line-height:1.5;color:${T.textMuted};font-family:${T.fontSans};">${escapeHtml(meta)}</div>` : ''}
        ${unitHint ? `<div style="margin-top:2px;font-size:12px;font-family:${T.fontSans};">${unitHint}</div>` : ''}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid ${T.border};text-align:center;color:${T.textMuted};font-size:13px;font-family:${T.fontSans};">${qty}</td>
      <td style="padding:12px 8px;border-bottom:1px solid ${T.border};text-align:right;font-weight:600;white-space:nowrap;color:${T.navy};font-size:14px;font-family:${T.fontSans};">
        ${money(line)} ₺
      </td>
    </tr>`;
        })
        .join('');

    const emptyRow =
        rows ||
        `<tr><td colspan="3" style="padding:16px 8px;color:${T.textMuted};font-size:13px;font-family:${T.fontSans};">Ürün satırları yüklenemedi.</td></tr>`;

    const head = withHeader
        ? `<thead><tr style="${T.tableHeader}">
        <th align="left" style="padding:10px 8px;font-weight:600;font-size:10px;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.06em;font-family:${T.fontSans};">Ürün</th>
        <th style="padding:10px 8px;font-weight:600;font-size:10px;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.06em;font-family:${T.fontSans};">Adet</th>
        <th align="right" style="padding:10px 8px;font-weight:600;font-size:10px;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.06em;font-family:${T.fontSans};">Tutar</th>
      </tr></thead>`
        : '';

    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:12px 0 0;">
      ${head}
      <tbody>${emptyRow}</tbody>
    </table>`;
}

/**
 * @param {Record<string, unknown>} order
 */
function renderDeliveryCard(order) {
    return `
    <div style="${T.cardSoft} margin-top:24px;">
      <h3 style="${T.labelUpper}">Teslimat</h3>
      <p style="margin:0;font-size:14px;color:${T.text};line-height:1.75;font-family:${T.fontSans};">
        <strong style="color:${T.navy};">${escapeHtml(order.fullName)}</strong><br>
        ${escapeHtml(order.address)}<br>
        <span style="color:${T.textMuted};">${escapeHtml(order.phone)}</span>
      </p>
    </div>`;
}

/**
 * @param {string} label
 * @param {string} href
 * @param {'primary' | 'navy'} [variant]
 */
function renderCtaButton(label, href, variant = 'primary') {
    if (!href) return '';
    const btnStyle = variant === 'navy' ? T.btnNavy : T.btnPrimary;
    return `
    <p style="text-align:center;margin:32px 0 8px;">
      <a href="${escapeHtml(href)}" style="${btnStyle}">${escapeHtml(label)}</a>
    </p>`;
}

/**
 * @param {string} orderIdShort
 * @param {string|number} totalAmount
 * @param {string} [extraHtml]
 * @param {{ hideTotal?: boolean }} [options]
 */
function renderOrderSummaryBox(orderIdShort, totalAmount, extraHtml = '', options = {}) {
    const totalLine =
        options.hideTotal === true
            ? ''
            : `<p style="margin:8px 0 0;font-size:18px;font-weight:700;color:${T.brand};font-family:${T.fontSans};">
        Toplam: ${money(totalAmount)} ₺
      </p>`;
    return `
    <div style="${T.cardNeutral} margin:20px 0;">
      <p style="margin:0;font-size:14px;color:${T.text};font-family:${T.fontSans};">
        Sipariş no:
        <strong style="color:${T.brand};font-family:${T.fontMono};font-weight:700;">#${escapeHtml(orderIdShort)}</strong>
      </p>
      ${totalLine}
      ${extraHtml}
    </div>`;
}

/**
 * Ürün listesi + genel toplam (teslim vb. durum mailleri).
 * @param {Array<Record<string, unknown>>} items
 * @param {string|number} totalAmount
 */
function renderOrderItemsSection(items, totalAmount) {
    const safeItems = Array.isArray(items) ? items : [];
    return `
    <div style="${T.cardSoft} margin:22px 0;">
      <h3 style="${T.labelUpper}">Siparişinizdeki ürünler</h3>
      ${renderOrderItemsTable(safeItems, true, { rich: true })}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0;border-collapse:collapse;">
        <tr>
          <td style="padding:16px 8px 0;font-weight:700;font-size:15px;color:${T.navy};font-family:${T.fontSans};border-top:2px solid ${T.border};">
            Genel toplam
          </td>
          <td align="right" style="padding:16px 8px 0;font-weight:700;font-size:20px;color:${T.brand};font-family:${T.fontSans};border-top:2px solid ${T.border};">
            ${money(totalAmount)} ₺
          </td>
        </tr>
      </table>
    </div>`;
}

module.exports = {
    renderOrderItemsTable,
    renderOrderItemsSection,
    renderDeliveryCard,
    renderCtaButton,
    renderOrderSummaryBox,
    formatOrderItemMeta,
};
