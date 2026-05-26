const baseLayout = require('./baseLayout');
const { escapeHtml, shortOrderId, firstNameFromOrder } = require('./_utils');
const { renderCtaButton, renderOrderSummaryBox } = require('./_orderBlocks');
const { buildPublicTrackingUrl } = require('../../utils/trackingLink');
const T = require('./emailTheme');

const STATUS_COPY = {
    hazirlaniyor: {
        title: 'Siparişiniz hazırlanıyor',
        message: 'Siparişiniz depoda özenle hazırlanıyor. Kargoya verildiğinde tekrar bilgilendireceğiz.',
        pillBg: '#fef9e8',
        pillColor: T.gold,
        border: '#f5e6c8',
    },
    kargolandi: {
        title: 'Siparişiniz kargoya verildi',
        message:
            'Siparişiniz MNG Kargo (DHL eCommerce) ile yola çıktı. Takip numaranız ve bağlantı aşağıdadır.',
        pillBg: T.brandMuted,
        pillColor: T.brand,
        border: '#f5d0d6',
    },
    'teslim-edildi': {
        title: 'Siparişiniz teslim edildi',
        message: 'Paketiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz!',
        pillBg: '#ecfdf3',
        pillColor: T.success,
        border: '#bbf7d0',
    },
    'iptal-edildi': {
        title: 'Siparişiniz iptal edildi',
        message: 'Siparişiniz iptal edildi. Ödeme alındıysa iade süreci kısa sürede başlatılır.',
        pillBg: '#fef2f2',
        pillColor: T.danger,
        border: '#fecaca',
    },
};

module.exports = function orderStatusUpdateTemplate({ order, newStatus, storeName, logoUrl, frontendUrl }) {
    const copy = STATUS_COPY[newStatus] || {
        title: 'Sipariş durumunuz güncellendi',
        message: `Sipariş durumu güncellendi.`,
        pillBg: T.brandMuted,
        pillColor: T.brand,
        border: '#f5d0d6',
    };

    const firstName = firstNameFromOrder(order);
    const orderShort = shortOrderId(order.id);
    const base = String(frontendUrl || '').replace(/\/$/, '');
    const ordersUrl = base ? `${base}/hesabim/siparisler` : '';

    const trackingNo = String(order.trackingNumber || '').trim();
    const trackUrl =
        newStatus === 'kargolandi' && trackingNo
            ? buildPublicTrackingUrl(order.carrier || 'MNG', trackingNo)
            : null;

    const trackingBlock =
        newStatus === 'kargolandi' && trackingNo
            ? `
    <div style="${T.cardSoft} margin:22px 0;">
      <h3 style="${T.labelUpper}">MNG / DHL eCommerce kargo takibi</h3>
      <p style="margin:0;font-family:${T.fontMono};font-size:17px;font-weight:700;color:${T.brand};letter-spacing:0.02em;">
        ${escapeHtml(trackingNo)}
      </p>
      ${trackUrl ? renderCtaButton('Kargonuzu MNG üzerinde takip edin', trackUrl) : ''}
    </div>`
            : '';

    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Sipariş durumu
    </p>
    <div style="display:inline-block;padding:8px 16px;background:${copy.pillBg};color:${copy.pillColor};border:1px solid ${copy.border};border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-family:${T.fontSans};">
      ${escapeHtml(copy.title)}
    </div>
    <h2 style="${T.headingLead}">
      Merhaba ${escapeHtml(firstName)},
    </h2>
    <p style="${T.bodyText}">
      ${escapeHtml(copy.message)}
    </p>
    ${trackingBlock}
    ${renderOrderSummaryBox(orderShort, order.totalAmount)}
    ${newStatus !== 'kargolandi' ? renderCtaButton('Siparişlerime git', ordersUrl) : ''}
    <div style="${T.cardNeutral} margin-top:16px;">
      <p style="margin:0;font-size:13px;line-height:1.65;color:${T.textSecondary};font-family:${T.fontSans};">
        Yardıma ihtiyacınız olursa <a href="${escapeHtml(base)}/iletisim" style="${T.link}">iletişim</a> sayfamızdan yazın.
      </p>
    </div>
  `;

    return {
        subject: `${copy.title} — #${orderShort}`,
        html: baseLayout({ title: copy.title, content, storeName, logoUrl }),
    };
};
