const baseLayout = require('./baseLayout');
const { escapeHtml } = require('./_utils');
const T = require('./emailTheme');

module.exports = function newsletterConfirmTemplate({ confirmUrl, storeName, logoUrl }) {
    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Bülten
    </p>
    <h2 style="${T.heading}">
      Aboneliğinizi onaylayın
    </h2>
    <p style="${T.bodyText}">
      ${escapeHtml(storeName)} e-posta bültenimize eklenmek için aşağıdaki düğmeye tıklayın. Böylece listeye yalnızca
      gerçekten ilgi duyanları alırız.
    </p>
    <p style="text-align:center;margin:36px 0;">
      <a href="${escapeHtml(confirmUrl)}"
         style="${T.btnPrimary}">
        Aboneliği onayla
      </a>
    </p>
    <p style="${T.mutedText}">
      Bu e-postayı siz talep etmediyseniz güvenle yok sayabilirsiniz.
    </p>
  `;
    return {
        subject: `${storeName} — E-posta bülteni onayı`,
        html: baseLayout({ title: 'Bülten onayı', content, storeName, logoUrl }),
    };
};
