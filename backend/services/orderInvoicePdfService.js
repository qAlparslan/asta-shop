const path = require('path');
const fs = require('fs');
const Order = require('../models/Order');
const { sendMail, getMailMeta } = require('./mailer');
const { publicOrderNumber } = require('./emailTemplates/_utils');
const { resolveSafeUploadFile } = require('../utils/uploadsPath');

function orderHasInvoicePdf(order) {
    const p = String(order?.invoicePdfPath ?? '').trim();
    if (p) return true;
    return String(order?.eInvoiceStatus ?? '') === 'submitted';
}

/**
 * @param {import('express').Request['file']} file
 * @param {import('sequelize').Model} order
 * @param {{ adminUser?: { id?: string; email?: string } }} ctx
 */
async function saveOrderInvoicePdfAndEmail(file, order, ctx = {}) {
    if (!file || !file.path) {
        throw new Error('PDF dosyası gerekli.');
    }
    if (String(order.status) !== 'teslim-edildi') {
        throw new Error('Fatura PDF yalnızca teslim edilmiş siparişlere yüklenebilir.');
    }

    const orderNo = publicOrderNumber(order);
    const relPath = `/uploads/invoices/${path.basename(file.path)}`;
    const abs = resolveSafeUploadFile(relPath);
    if (!abs || !fs.existsSync(abs)) {
        throw new Error('Dosya kaydedilemedi.');
    }

    await order.update({
        invoicePdfPath: relPath,
        eInvoiceStatus: 'submitted',
        eInvoiceIntegrationRef: relPath,
        eInvoiceLastError: null,
    });

    const { storeName, logoUrl } = await getMailMeta();
    const to = String(order.email || '').trim();
    const subject = `Faturanız — Sipariş ${orderNo}`;
    const html = `
      <p>Merhaba ${order.fullName ? String(order.fullName).replace(/</g, '&lt;') : ''},</p>
      <p><strong>${storeName || 'Asta Ticaret'}</strong> siparişiniz (<strong>${orderNo}</strong>) için fatura PDF ekte yer almaktadır.</p>
      <p>İyi günler dileriz.</p>
    `;

    const mailResult = await sendMail({
        to,
        subject,
        html,
        type: 'orderInvoicePdf',
        relatedId: order.id,
        metadata: { orderNumber: orderNo, adminId: ctx.adminUser?.id || null },
        attachments: [
            {
                filename: `fatura-${orderNo}.pdf`,
                path: abs,
                contentType: 'application/pdf',
            },
        ],
    });

    if (!mailResult.success) {
        await order.update({
            eInvoiceLastError: String(mailResult.error || 'E-posta gönderilemedi').slice(0, 2000),
        });
        throw new Error(
            mailResult.error === 'no-recipient'
                ? 'Sipariş e-posta adresi geçersiz; fatura kaydedildi ancak mail gönderilemedi.'
                : `Fatura kaydedildi ancak e-posta gönderilemedi: ${mailResult.error || 'bilinmeyen hata'}`,
        );
    }

    return { order: order.toJSON ? order.toJSON() : order, emailSent: true };
}

module.exports = { saveOrderInvoicePdfAndEmail, orderHasInvoicePdf };
