const baseLayout = require('./baseLayout');
const { escapeHtml } = require('./_utils');
const T = require('./emailTheme');
const { interpolate, subjectSafe } = require('../emailTemplateInterpolator');

/**
 * Genel kampanya/pazarlama mail şablonu.
 */
module.exports = function campaignTemplate({
    title,
    bodyHtml,
    ctaText,
    ctaUrl,
    recipientName,
    storeName,
    logoUrl,
    unsubscribeUrl,
    coupon,
    templateVars = {},
}) {
    const tv = { ...templateVars };
    if (coupon && coupon.code) {
        tv.kupon_code = String(coupon.code);
    }

    const titleInner = interpolate(title || '', tv);
    const bodyRendered = interpolate(bodyHtml || '', tv);
    const subjectLine = interpolate(title || '', tv, { escapeFn: subjectSafe });

    const greeting = recipientName
        ? `<p style="${T.bodyText}">Merhaba ${escapeHtml(recipientName)},</p>`
        : '';

    const cta =
        ctaText && ctaUrl
            ? `<p style="text-align:center;margin:28px 0;">
            <a href="${escapeHtml(ctaUrl)}"
               style="${T.btnPrimary}">
              ${escapeHtml(ctaText)}
            </a>
          </p>`
            : '';

    let couponBlock = '';
    if (coupon && coupon.code) {
        const expiry = coupon.expiresAt
            ? `<div style="margin-top:10px;font-size:11px;color:${T.textMuted};">Geçerlilik: ${new Date(coupon.expiresAt).toLocaleDateString('tr-TR')}</div>`
            : '';
        couponBlock = `
        <div style="margin:28px 0;padding:26px 22px;background:${T.brandMuted};border:2px dashed ${T.brand};border-radius:16px;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:${T.brand};text-transform:uppercase;letter-spacing:0.12em;font-family:${T.fontSans};">
            Size özel
          </div>
          <div style="font-size:32px;font-weight:700;color:${T.navy};margin:12px 0 6px;font-family:${T.fontDisplay};letter-spacing:-0.02em;">
            %${escapeHtml(coupon.discountPercent)} indirim
          </div>
          <div style="font-family:${T.fontMono};font-size:16px;font-weight:700;background:${T.surface};padding:12px 22px;border-radius:10px;display:inline-block;margin-top:14px;color:${T.navy};border:1px solid ${T.border};letter-spacing:0.1em;">
            ${escapeHtml(coupon.code)}
          </div>
          ${expiry}
        </div>`;
    }

    const content = `
    <div style="font-size:12px;line-height:1.5;color:${T.gold};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:${T.fontSans};margin-bottom:6px;">
      Kampanya
    </div>
    <h2 style="${T.heading}">
      ${titleInner}
    </h2>
    ${greeting}
    <div style="font-size:15px;line-height:1.7;color:${T.textSecondary};font-family:${T.fontSans};">
      ${bodyRendered}
    </div>
    ${couponBlock}
    ${cta}
    <hr style="border:none;border-top:1px solid ${T.border};margin:36px 0 18px;">
    <p style="margin:0;font-size:11px;color:${T.textFaint};text-align:center;line-height:1.7;font-family:${T.fontSans};">
      Bu e-postayı ${escapeHtml(storeName)} müşteri topluluğunun bir parçası olduğunuz için alıyorsunuz.<br>
      Pazarlama iletişimi almak istemiyorsanız
      <a href="${escapeHtml(unsubscribeUrl)}" style="${T.linkUnderline}font-size:11px;">abonelikten çıkın</a>.
    </p>
  `;

    return {
        subject: subjectLine,
        html: baseLayout({ title: subjectLine, content, storeName, logoUrl }),
    };
};
