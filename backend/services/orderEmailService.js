const { sendMail, getMailMeta, getFrontendUrl } = require('./mailer');
const orderConfirmationTemplate = require('./emailTemplates/orderConfirmation');
const adminNewOrderTemplate = require('./emailTemplates/adminNewOrder');
const orderStatusUpdateTemplate = require('./emailTemplates/orderStatusUpdate');
const { normalizeOrderForEmail } = require('./emailTemplates/_utils');
const User = require('../models/User');

async function resolveAdminRecipients() {
    const fromEnv = (process.env.ADMIN_NOTIFICATION_EMAIL || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (fromEnv.length > 0) return fromEnv;
    const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['email'] });
    return admins.map((a) => a.email).filter(Boolean);
}

/**
 * @param {object} order — Sequelize instance veya plain object
 */
async function sendOrderConfirmationEmail(order) {
    const normalized = normalizeOrderForEmail(order);
    if (!normalized.email) {
        console.warn('[order-mail] onay: alıcı e-posta yok, atlandı');
        return { success: false, error: 'no-email' };
    }
    try {
        const meta = await getMailMeta();
        const tpl = orderConfirmationTemplate({
            order: normalized,
            storeName: meta.storeName,
            logoUrl: meta.logoUrl,
            frontendUrl: getFrontendUrl(),
        });
        return await sendMail({
            to: normalized.email,
            ...tpl,
            type: 'orderConfirmation',
            relatedId: normalized.id,
        });
    } catch (e) {
        console.error('[order-mail] onay şablonu/gönderim:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * @param {object} order
 */
async function sendAdminNewOrderEmail(order) {
    const normalized = normalizeOrderForEmail(order);
    try {
        const recipients = await resolveAdminRecipients();
        if (recipients.length === 0) {
            console.warn('[order-mail] admin bildirimi: alıcı yok (ADMIN_NOTIFICATION_EMAIL veya admin kullanıcı)');
            return { success: false, error: 'no-admin-recipients' };
        }
        const meta = await getMailMeta();
        const tpl = adminNewOrderTemplate({
            order: normalized,
            storeName: meta.storeName,
            logoUrl: meta.logoUrl,
            frontendUrl: getFrontendUrl(),
        });
        return await sendMail({
            to: recipients.join(','),
            ...tpl,
            type: 'adminNewOrder',
            relatedId: normalized.id,
        });
    } catch (e) {
        console.error('[order-mail] admin bildirimi:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * @param {object} order
 * @param {string} newStatus
 */
async function sendOrderStatusUpdateEmail(order, newStatus) {
    const normalized = normalizeOrderForEmail(order);
    if (!normalized.email) {
        console.warn('[order-mail] durum güncelleme: alıcı e-posta yok');
        return { success: false, error: 'no-email' };
    }
    try {
        const meta = await getMailMeta();
        const tpl = orderStatusUpdateTemplate({
            order: normalized,
            newStatus,
            storeName: meta.storeName,
            logoUrl: meta.logoUrl,
            frontendUrl: getFrontendUrl(),
        });
        return await sendMail({
            to: normalized.email,
            ...tpl,
            type: 'orderStatusUpdate',
            relatedId: normalized.id,
            metadata: { newStatus },
        });
    } catch (e) {
        console.error('[order-mail] durum maili:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = {
    sendOrderConfirmationEmail,
    sendAdminNewOrderEmail,
    sendOrderStatusUpdateEmail,
    normalizeOrderForEmail,
};
