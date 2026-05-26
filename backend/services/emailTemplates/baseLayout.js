const { escapeHtml } = require('./_utils');
const T = require('./emailTheme');

/**
 * Tüm transactional / pazarlama mailleri — Asta storefront (lacivert + bordo + altın aksan).
 * Inline CSS; tablo tabanlı uyumluluk. Google Fonts: Inter + Playfair Display.
 */
function baseLayout({ title, content, storeName = 'Asta Ticaret', logoUrl = '' }) {
    const safeName = escapeHtml(storeName);
    const logo = logoUrl
        ? `<img src="${escapeHtml(logoUrl)}" alt="${safeName}" width="200" height="48" style="height:48px;max-height:48px;width:auto;max-width:200px;display:inline-block;border:0;outline:none;">`
        : `<p style="margin:0;font-family:${T.fontDisplay};font-size:28px;font-weight:700;color:#1a2332;letter-spacing:-0.03em;line-height:1.1;">${safeName}</p>`;

    return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(title)}</title>
<!--[if mso]>
<noscript>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
</noscript>
<![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;width:100%;font-family:${T.fontSans};background:${T.pageBg};color:${T.text};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.pageBg};padding:32px 16px;mso-cellspacing:0;mso-padding-alt:32px 16px;">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${T.surface};border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06);border:1px solid ${T.border};mso-cellspacing:0;">
      <tr><td style="${T.stripNavy}">&nbsp;</td></tr>
      <tr><td style="${T.stripBrand}">&nbsp;</td></tr>
      <tr><td style="padding:26px 32px 20px;text-align:center;border-bottom:1px solid ${T.border};background:${T.surfaceSoft};background-color:#fafafa;">
        ${logo}
        <p style="margin:10px 0 0;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">${safeName}</p>
      </td></tr>
      <tr><td style="padding:32px 32px 28px;mso-padding-alt:32px;">
        ${content}
      </td></tr>
      <tr><td style="padding:0;">
        <div style="${T.footerAccentLine}margin:0 32px;"></div>
      </td></tr>
      <tr><td style="padding:22px 32px 26px;text-align:center;font-size:12px;color:${T.textMuted};line-height:1.7;font-family:${T.fontSans};background:${T.brandMuted};">
        © ${new Date().getFullYear()} ${safeName}<br>
        <span style="color:${T.textFaint};">Bu ileti sistem tarafından otomatik gönderilmiştir.</span>
      </td></tr>
    </table>
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin-top:16px;"><tr><td style="padding:8px;text-align:center;font-size:11px;color:${T.textFaint};font-family:${T.fontSans};line-height:1.55;">
      Doğal, saf ve güvenilir alışveriş deneyimi.
    </td></tr></table>
  </td></tr>
</table>
</body>
</html>`;
}

module.exports = baseLayout;
