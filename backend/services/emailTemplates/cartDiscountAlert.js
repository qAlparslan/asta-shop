const baseLayout = require('./baseLayout');
const { escapeHtml } = require('./_utils');
const T = require('./emailTheme');

/**
 * Sepette bekleyen ürün indirime girdiğinde müşteriye gönderilir.
 */
module.exports = function cartDiscountAlertTemplate({
    recipientName,
    productName,
    productUrl,
    discountPercent,
    salePriceLabel,
    compareAtLabel,
    storeName,
    logoUrl,
}) {
    const name = escapeHtml(recipientName || 'değerli müşterimiz');
    const pName = escapeHtml(productName || 'Ürün');
    const link = productUrl ? escapeHtml(productUrl) : '';
    const pct = Math.max(1, Math.min(99, Math.floor(Number(discountPercent)) || 0));

    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Sepetiniz
    </p>
    <h2 style="${T.heading}">
      Sepetinizdeki ürün indirime girdi
    </h2>
    <p style="${T.bodyText}">
      Merhaba <strong style="color:${T.navy};">${name}</strong>,
    </p>
    <p style="${T.bodyText}">
      Sepetinizde bekleyen <strong style="color:${T.navy};">${pName}</strong> ürünü
      <strong style="color:${T.brand};">%${pct}</strong> indirime girdi.
    </p>
    ${
        compareAtLabel && salePriceLabel
            ? `<p style="margin:16px 0 0;font-size:15px;color:${T.textMuted};font-family:${T.fontSans};">
      <span style="text-decoration:line-through;">${escapeHtml(compareAtLabel)}</span>
      <strong style="color:${T.brand};margin-left:8px;">${escapeHtml(salePriceLabel)}</strong>
    </p>`
            : ''
    }
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
        title: 'Sepetinizdeki ürün indirime girdi',
        content,
        storeName,
        logoUrl,
    });
};
