const baseLayout = require('./baseLayout');
const { escapeHtml } = require('./_utils');
const T = require('./emailTheme');

/**
 * Ürün yorumu onaylandığında (yalnızca giriş yapmış yazar) bilgilendirme maili.
 */
module.exports = function productReviewApprovedTemplate({
    recipientName,
    productName,
    productUrl,
    rating,
    storeName,
    logoUrl,
}) {
    const name = escapeHtml(recipientName || 'değerli müşterimiz');
    const pName = escapeHtml(productName || 'Ürün');
    const link = productUrl ? escapeHtml(productUrl) : '';
    let ratingBlock = '';
    if (rating != null && rating !== '') {
        const r = Math.min(5, Math.max(0, Math.floor(Number(rating)) || 0));
        const starsUnicode = `${'\u2605'.repeat(r)}${'\u2606'.repeat(5 - r)}`;
        ratingBlock = `<p style="margin:12px 0 0;"><span aria-hidden="true" style="font-size:17px;letter-spacing:3px;color:${T.gold};">${starsUnicode}</span><span style="font-size:13px;color:${T.textMuted};margin-left:10px;font-family:${T.fontSans};vertical-align:middle;">${r}/5</span></p>`;
    }

    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Yorum
    </p>
    <h2 style="${T.heading}">
      Yorumunuz yayında
    </h2>
    <p style="${T.bodyText}">
      Merhaba <strong style="color:${T.navy};">${name}</strong>,
    </p>
    <p style="${T.bodyText}">
      <strong style="color:${T.navy};">${pName}</strong> için yazdığınız yorum onaylandı ve ürün sayfasında görünüyor.
    </p>
    ${ratingBlock}
    ${
        link
            ? `<p style="margin:32px 0 0;text-align:center;">
      <a href="${link}" style="${T.btnPrimary}">
        Ürünü görüntüle
      </a>
    </p>`
            : ''
    }
  `;

    return baseLayout({
        title: 'Yorumunuz yayında',
        content,
        storeName,
        logoUrl,
    });
};
