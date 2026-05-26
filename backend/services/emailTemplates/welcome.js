const baseLayout = require('./baseLayout');
const { escapeHtml } = require('./_utils');
const T = require('./emailTheme');

module.exports = function welcomeTemplate({ fullName, storeName, logoUrl, frontendUrl }) {
    const firstName = String(fullName || '').split(' ')[0] || 'değerli müşterimiz';
    const base = String(frontendUrl || '').replace(/\/$/, '');
    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Üyelik
    </p>
    <h2 style="${T.heading}">
      Hoş geldin, ${escapeHtml(firstName)}!
    </h2>
    <p style="${T.bodyText}">
      ${escapeHtml(storeName)} ailesine katıldığın için teşekkürler. Güvenilir alışveriş, seçilmiş ürünler ve kampanyalar
      seni bekliyor.
    </p>
    <p style="text-align:center;margin:36px 0;">
      <a href="${escapeHtml(base)}/urunler"
         style="${T.btnPrimary}">
        Alışverişe başla
      </a>
    </p>
    <div style="${T.cardNeutral}">
      <p style="margin:0;font-size:14px;line-height:1.65;color:${T.textSecondary};font-family:${T.fontSans};">
        Sorunda <a href="${escapeHtml(base)}/iletisim" style="${T.link}">iletişim</a> sayfamızdan bize yazabilirsin.
      </p>
    </div>
    <p style="${T.mutedText} margin-top:24px;">
      Keyifli günler dileriz.
    </p>
  `;
    return {
        subject: `${storeName} ailesine hoş geldin`,
        html: baseLayout({ title: 'Hoş geldin', content, storeName, logoUrl }),
    };
};
