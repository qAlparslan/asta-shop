const baseLayout = require('./baseLayout');
const { escapeHtml, shortOrderId, money, firstNameFromOrder } = require('./_utils');
const {
    renderOrderItemsTable,
    renderDeliveryCard,
    renderCtaButton,
    renderOrderSummaryBox,
} = require('./_orderBlocks');
const T = require('./emailTheme');

module.exports = function orderConfirmationTemplate({ order, storeName, logoUrl, frontendUrl }) {
    const firstName = firstNameFromOrder(order);
    const items = Array.isArray(order.items) ? order.items : [];
    const base = String(frontendUrl || '').replace(/\/$/, '');
    const ordersUrl = base ? `${base}/hesabim/siparisler` : '';
    const orderShort = shortOrderId(order.id);

    const couponLine =
        typeof order.couponCode === 'string' && order.couponCode.trim()
            ? `<p style="margin:10px 0 0;font-size:13px;color:${T.textMuted};font-family:${T.fontSans};">Kupon: <strong style="color:${T.brand};">${escapeHtml(order.couponCode.trim())}</strong></p>`
            : '';

    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Sipariş onayı
    </p>
    <h2 style="${T.heading}">
      Teşekkürler, ${escapeHtml(firstName)}!
    </h2>
    <p style="${T.bodyText}">
      Ödemeniz alındı ve siparişiniz <strong style="color:${T.navy};">hazırlanmaya</strong> alındı.
      Kargoya verildiğinde size ayrı bir e-posta ile haber vereceğiz.
    </p>

    <div style="display:inline-block;padding:8px 16px;background:#fef9e8;color:${T.gold};border:1px solid #f5e6c8;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-family:${T.fontSans};">
      Hazırlanıyor
    </div>

    ${renderOrderSummaryBox(orderShort, order.totalAmount, couponLine)}

    ${renderOrderItemsTable(items, true)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0;border-collapse:collapse;">
      <tr>
        <td style="padding:16px 8px 0;font-weight:700;font-size:15px;color:${T.navy};font-family:${T.fontSans};border-top:2px solid ${T.border};">
          Genel toplam
        </td>
        <td align="right" style="padding:16px 8px 0;font-weight:700;font-size:20px;color:${T.brand};font-family:${T.fontSans};border-top:2px solid ${T.border};">
          ${money(order.totalAmount)} ₺
        </td>
      </tr>
    </table>

    ${renderDeliveryCard(order)}

    ${renderCtaButton('Siparişlerimi görüntüle', ordersUrl)}

    <div style="${T.cardNeutral} margin-top:8px;">
      <p style="margin:0;font-size:13px;line-height:1.65;color:${T.textSecondary};font-family:${T.fontSans};">
        Sorularınız için <a href="${escapeHtml(base)}/iletisim" style="${T.link}">iletişim</a> sayfamızdan bize yazabilirsiniz.
      </p>
    </div>
  `;

    return {
        subject: `Siparişiniz alındı — #${orderShort}`,
        html: baseLayout({ title: 'Sipariş onayı', content, storeName, logoUrl }),
    };
};
