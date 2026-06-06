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

    const priceBlock =
        compareAtLabel && salePriceLabel
            ? `
    <div style="margin:24px 0;padding:22px 20px;background:${T.surface};border:1px solid ${T.border};border-radius:16px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.textMuted};font-family:${T.fontSans};">
        Sepetinizdeki ürün
      </p>
      <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:${T.navy};font-family:${T.fontDisplay};line-height:1.35;">
        ${pName}
      </p>
      <p style="margin:0;font-size:14px;color:${T.textMuted};font-family:${T.fontSans};">
        <span style="text-decoration:line-through;color:${T.textFaint};">${escapeHtml(compareAtLabel)}</span>
        <span style="display:inline-block;margin-left:10px;font-size:22px;font-weight:800;color:${T.brand};letter-spacing:-0.02em;">
          ${escapeHtml(salePriceLabel)}
        </span>
      </p>
    </div>`
            : `
    <div style="margin:24px 0;padding:22px 20px;background:${T.surface};border:1px solid ${T.border};border-radius:16px;">
      <p style="margin:0;font-size:17px;font-weight:700;color:${T.navy};font-family:${T.fontDisplay};line-height:1.35;">
        ${pName}
      </p>
    </div>`;

    const content = `
    <div style="margin:0 0 20px;padding:28px 22px;background:${T.brandMuted};border:2px dashed ${T.brand};border-radius:18px;text-align:center;">
      <p style="margin:0 0 8px;font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${T.brand};font-family:${T.fontSans};">
        Kaçırmayın — sınırlı fırsat
      </p>
      <p style="margin:0;font-size:48px;line-height:1;font-weight:800;color:${T.navy};font-family:${T.fontDisplay};letter-spacing:-0.03em;">
        %${pct}
      </p>
      <p style="margin:8px 0 0;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.brand};font-family:${T.fontSans};">
        İndirim
      </p>
    </div>

    <h2 style="${T.heading}">
      Sepetinizdeki ürün indirime girdi
    </h2>
    <p style="${T.bodyText}">
      Merhaba <strong style="color:${T.navy};">${name}</strong>,
    </p>
    <p style="${T.bodyText}">
      Tam satın almak üzere olduğunuz ürün şimdi <strong style="color:${T.brand};">%${pct} indirimde</strong>.
      Fırsatı kaçırmayın — ürün hâlâ sepetinizde sizi bekliyor.
    </p>

    ${priceBlock}

    <div style="${T.cardSoft}">
      <p style="margin:0;font-size:14px;line-height:1.65;color:${T.textSecondary};font-family:${T.fontSans};">
        <strong style="color:${T.navy};">İpucu:</strong> İndirimli fiyatlar stok ve kampanya süresine bağlı olarak değişebilir.
        En iyi fiyatı yakalamak için bugün tamamlamanızı öneririz.
      </p>
    </div>

    ${
        link
            ? `<p style="margin:32px 0 8px;text-align:center;">
      <a href="${link}" style="${T.btnPrimary}">
        Fırsatı yakala — ürüne git
      </a>
    </p>
    <p style="margin:0;text-align:center;font-size:12px;color:${T.textFaint};font-family:${T.fontSans};">
      Butona tıklayarak ürün sayfasına gidebilir ve siparişinizi hemen tamamlayabilirsiniz.
    </p>`
            : ''
    }
  `;

    return baseLayout({
        title: `Kaçırmayın! Sepetinizdeki ürün %${pct} indirimde`,
        content,
        storeName,
        logoUrl,
    });
};
