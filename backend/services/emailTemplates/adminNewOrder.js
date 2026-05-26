const baseLayout = require('./baseLayout');
const { escapeHtml, shortOrderId, money } = require('./_utils');
const { renderOrderItemsTable, renderCtaButton } = require('./_orderBlocks');
const T = require('./emailTheme');

module.exports = function adminNewOrderTemplate({ order, storeName, logoUrl, frontendUrl }) {
    const base = String(frontendUrl || '').replace(/\/$/, '');
    const adminOrdersUrl = base ? `${base}/admin/siparisler` : '';
    const items = Array.isArray(order.items) ? order.items : [];
    const orderShort = shortOrderId(order.id);

    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Yönetici bildirimi
    </p>
    <h2 style="${T.heading}">
      Yeni sipariş geldi
    </h2>
    <p style="margin:0 0 20px;color:${T.textMuted};font-size:14px;font-family:${T.fontSans};">
      <strong style="color:${T.brand};font-family:${T.fontMono};font-weight:700;">#${orderShort}</strong>
      · ${money(order.totalAmount)} ₺ · durum: <strong style="color:${T.navy};">${escapeHtml(order.status || 'hazirlaniyor')}</strong>
    </p>

    ${renderOrderItemsTable(items, true)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;border-collapse:collapse;">
      <tr>
        <td colspan="2" align="right" style="padding:14px 8px 0;font-weight:700;font-size:14px;color:${T.navy};font-family:${T.fontSans};">Genel toplam</td>
        <td align="right" style="padding:14px 8px 0;font-weight:700;font-size:18px;color:${T.brand};font-family:${T.fontSans};">${money(order.totalAmount)} ₺</td>
      </tr>
    </table>

    <div style="${T.cardSoft} margin-top:22px;">
      <h3 style="${T.labelUpper}">Müşteri</h3>
      <p style="margin:0;font-size:14px;line-height:1.75;color:${T.text};font-family:${T.fontSans};">
        <strong style="color:${T.navy};">${escapeHtml(order.fullName)}</strong><br>
        <a href="mailto:${escapeHtml(order.email)}" style="${T.link}">${escapeHtml(order.email)}</a><br>
        ${escapeHtml(order.phone)}<br>
        <span style="color:${T.textMuted};">${escapeHtml(order.address)}</span>
      </p>
    </div>

    ${renderCtaButton('Admin panelde siparişi aç', adminOrdersUrl, 'navy')}
  `;

    return {
        subject: `[Yeni sipariş] #${orderShort} — ${money(order.totalAmount)} ₺`,
        html: baseLayout({ title: 'Yeni sipariş', content, storeName, logoUrl }),
    };
};
