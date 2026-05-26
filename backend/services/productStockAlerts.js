const ProductStockAlert = require('../models/ProductStockAlert');
const { sendMail, getMailMeta, getFrontendUrl, getBackendPublicUrl } = require('./mailer');
const baseLayout = require('./emailTemplates/baseLayout');
const { escapeHtml } = require('./emailTemplates/_utils');
const T = require('./emailTemplates/emailTheme');

/**
 * Ürün tekrar stokta olduğunda bekleyen aboneliklere bildir maili gönderir ve kayıtları siler.
 * @param {import('../models/Product')} product
 */
async function notifyStockRestock(product) {
    if (!product?.id) return;

    const alerts = await ProductStockAlert.findAll({ where: { productId: product.id } });
    if (!alerts.length) return;

    const meta = await getMailMeta();
    const frontendUrl = getFrontendUrl();
    const slug = product.slug;
    const productUrl =
        slug && frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/urun/${slug}` : frontendUrl;

    const parsedImages =
        typeof product.images === 'string'
            ? (() => {
                  try {
                      return JSON.parse(product.images);
                  } catch {
                      return [];
                  }
              })()
            : product.images || [];

    const backendUrl = getBackendPublicUrl();
    const rawImg = parsedImages[0] || '';
    const firstImg =
        rawImg && typeof rawImg === 'string'
            ? rawImg.startsWith('http')
                ? rawImg
                : `${backendUrl.replace(/\/$/, '')}${rawImg.startsWith('/') ? '' : '/'}${rawImg.replace(/^\//, '')}`
            : '';

    const subject = `${product.name || 'Ürün'} tekrar stokta`;

    for (const a of alerts) {
        try {
            const nameSafe = escapeHtml(product.name || 'Ürün');
            const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Stok
    </p>
    <h2 style="${T.heading}">
      Tekrar stoğa geldi
    </h2>
    <p style="${T.bodyText}">
      Merhaba,<br><br>
      İlgi gösterdiğiniz <strong style="color:${T.navy};">${nameSafe}</strong> ürünü yeniden satışta.
    </p>
    ${
        productUrl
            ? `<p style="text-align:center;margin:28px 0;">
          <a href="${escapeHtml(productUrl)}" style="${T.btnPrimary}">Ürüne git</a>
        </p>`
            : `<p style="${T.mutedText}">Ürünü mağazamızdan bulabilirsiniz.</p>`
    }
    ${
        firstImg
            ? `<p style="margin-top:20px;"><img src="${escapeHtml(firstImg)}" alt="${nameSafe}" width="200" style="max-width:100%;height:auto;border-radius:8px;"></p>`
            : ''
    }
    `;

            await sendMail({
                to: a.email,
                subject,
                html: baseLayout({
                    title: 'Stok bildirimi',
                    content,
                    storeName: meta.storeName,
                    logoUrl: meta.logoUrl,
                }),
                text: `${product.name} tekrar stokta.\n${productUrl || ''}`,
                type: 'stockRestockAlert',
                relatedId: product.id,
            });
        } catch (e) {
            console.error('stock alert mail:', e.message);
        }
    }

    await ProductStockAlert.destroy({ where: { productId: product.id } });
}

async function purgeAlertsForUnavailableProduct(productId) {
    await ProductStockAlert.destroy({ where: { productId } });
}

module.exports = { notifyStockRestock, purgeAlertsForUnavailableProduct };
