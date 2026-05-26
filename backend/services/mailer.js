const nodemailer = require('nodemailer');

let transporterPromise = null;
let etherealInfo = null;

/** .env'de yanlışlıkla tırnaklı yazılmış SMTP şifre/kullanıcı düzeltmesi */
function envStripQuotes(value) {
    const s = String(value ?? '').trim();
    if (
        (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
        (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
    ) {
        return s.slice(1, -1);
    }
    return s;
}

/**
 * Tek transporter cache:
 * - .env'de SMTP_HOST varsa onu kullanır (production)
 * - Yoksa Ethereal Email test inbox'ı otomatik açar (geliştirme).
 *   Bu durumda gerçek mail gitmez, console'da preview link basılır.
 */
function readSmtpAuthFromEnv() {
    const user = envStripQuotes(process.env.SMTP_USER);
    const pass = envStripQuotes(process.env.SMTP_PASS);
    const rawPass = String(process.env.SMTP_PASS ?? '');
    if (user && pass && rawPass.includes('#') && !rawPass.trim().startsWith('"') && !rawPass.trim().startsWith("'")) {
        console.warn(
            '[mailer] SMTP_PASS içinde # var ama tırnak yok — dotenv şifreyi # öncesinde kesmiş olabilir. .env\'de SMTP_PASS="..." kullanın.',
        );
    }
    if (user && pass.length < 4) {
        console.warn('[mailer] SMTP_PASS çok kısa görünüyor — .env şifre satırını kontrol edin (# yorum sayılır).');
    }
    return { user, pass };
}

function getTransporter() {
    if (transporterPromise) return transporterPromise;

    if (process.env.SMTP_HOST) {
        const smtpAuth = readSmtpAuthFromEnv();
        transporterPromise = Promise.resolve(
            nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT, 10) || 587,
                secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
                auth: smtpAuth.user ? { user: smtpAuth.user, pass: smtpAuth.pass } : undefined,
            })
        );
    } else {
        transporterPromise = nodemailer
            .createTestAccount()
            .then((account) => {
                etherealInfo = account;
                console.log('');
                console.log('📧  Ethereal test inbox kuruldu (geliştirme modu)');
                console.log(`    SMTP_USER: ${account.user}`);
                console.log(`    SMTP_PASS: ${account.pass}`);
                console.log('    Gönderilen tüm mailler için console\'da preview link çıkacaktır.');
                console.log('    Gerçek mail göndermek için .env\'ye SMTP_HOST/SMTP_USER/SMTP_PASS ekleyin.');
                console.log('');
                return nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: { user: account.user, pass: account.pass },
                });
            })
            .catch((err) => {
                console.error('❌ Ethereal hesabı oluşturulamadı:', err.message);
                console.error('   Mail gönderimi devre dışı kaldı. .env\'ye SMTP yapılandırması ekleyin.');
                transporterPromise = null;
                throw err;
            });
    }

    return transporterPromise;
}

/**
 * Dış dünyada görünen API kökü — uploads/logo tam URL. Canlı: BACKEND_PUBLIC_URL veya API_PUBLIC_URL.
 */
function getBackendPublicUrl() {
    const explicit = (process.env.BACKEND_PUBLIC_URL || process.env.API_PUBLIC_URL || '').trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    if (process.env.NODE_ENV !== 'production') {
        return `http://localhost:${process.env.PORT || 5000}`;
    }
    console.warn(
        '[mailer] BACKEND_PUBLIC_URL eksik — logo/admin görselleri tam URL alamaz. Örn: BACKEND_PUBLIC_URL=https://api.astaticaret.com',
    );
    return '';
}

/**
 * Site ayarlarından mail meta verisi okur (marka adı, logo URL).
 */
async function getMailMeta() {
    try {
        const SiteSetting = require('../models/SiteSetting');
        const rows = await SiteSetting.findAll();
        const meta = { storeName: 'Asta Ticaret', logoUrl: '' };
        const backendUrl = getBackendPublicUrl();
        for (const r of rows) {
            if (r.key === 'storeName' && r.value) meta.storeName = r.value;
            else if (r.key === 'logoUrl' && r.value) {
                meta.logoUrl = r.value.startsWith('http') ? r.value : `${backendUrl}${r.value}`;
            }
        }
        return meta;
    } catch {
        return { storeName: 'Asta Ticaret', logoUrl: '' };
    }
}

function getFrontendUrl() {
    const raw = process.env.FRONTEND_PUBLIC_URL;
    if (raw && raw.trim()) return raw.replace(/\/+$/, '');
    const origins = (process.env.FRONTEND_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const preferred = origins.find((o) => /:3001(\/|$)/.test(o));
    if (preferred) return preferred.replace(/\/+$/, '');
    if (origins.length > 0) return origins[0].replace(/\/+$/, '');
    if (process.env.NODE_ENV !== 'production') {
        return 'http://localhost:3001';
    }
    console.warn(
        '[mailer] FRONTEND_PUBLIC_URL ve FRONTEND_ORIGINS bos — e-posta linkleri icin .env doldurun.',
    );
    return '';
}

function stripHtml(html) {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 4000);
}

async function logEmail(entry) {
    try {
        const EmailLog = require('../models/EmailLog');
        await EmailLog.create(entry);
    } catch (err) {
        // EmailLog tablosu henüz oluşmadıysa veya başka bir DB hatası olduysa
        // sadece sessizce yutalım — log için ana akışı bozmaya değmez.
        if (!/no such table|doesn't exist/i.test(String(err.message))) {
            console.warn(`⚠️ EmailLog kaydı atlandı: ${err.message}`);
        }
    }
}

/**
 * Bir mail gönderir. Fire-and-forget kullanın — istek/yanıtı bekletmesin.
 * Başarısızlık sadece log'a düşer; uygulamanın ana akışını bozmaz.
 *
 * @param {object} opts
 * @param {string} opts.to         Alıcı adres(ler)
 * @param {string} opts.subject    Konu
 * @param {string} opts.html       HTML gövde
 * @param {string} [opts.text]     Metin gövde (verilmezse HTML'den üretilir)
 * @param {string} [opts.type]     Log kategorisi
 * @param {string} [opts.relatedId] İlgili kayıt id (sipariş/kampanya/kullanıcı vb.)
 * @param {object} [opts.metadata] Ek meta veri
 * @param {string[]} [opts.headers] Ek başlıklar (örn: List-Unsubscribe)
 * @param {string} [opts.campaignId] İlişkili kampanya id
 * @param {string} [opts.variant]    A/B test varyantı ('A'|'B')
 */
async function sendMail({
    to, subject, html, text, type = 'generic',
    relatedId = null, metadata = null, headers = null,
    campaignId = null, variant = null,
}) {
    if (!to) {
        console.warn(`⚠️ [mail/${type}] alıcı yok, mail gönderilmedi`);
        await logEmail({ toAddress: '(empty)', subject: subject || '', type, status: 'failed', errorMessage: 'no-recipient', relatedId, metadata, campaignId, variant });
        return { success: false, error: 'no-recipient' };
    }

    try {
        const transporter = await getTransporter();
        const fromName = process.env.MAIL_FROM_NAME || 'Asta Ticaret';
        const fromAddress =
            envStripQuotes(process.env.MAIL_FROM_ADDRESS) ||
            envStripQuotes(process.env.SMTP_USER) ||
            (etherealInfo ? etherealInfo.user : 'no-reply@astaticaret.com');

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to,
            subject,
            html,
            text: text || stripHtml(html),
            ...(headers ? { headers } : {}),
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`📬 [mail/${type}] ${to}  →  Preview: ${previewUrl}`);
        } else {
            console.log(`📬 [mail/${type}] ${to}  →  messageId: ${info.messageId}`);
        }

        await logEmail({
            toAddress: String(to).slice(0, 500),
            subject: String(subject || '').slice(0, 500),
            type,
            status: 'success',
            previewUrl: previewUrl || null,
            relatedId,
            metadata,
            campaignId,
            variant,
        });

        return { success: true, info, previewUrl };
    } catch (err) {
        console.error(`❌ [mail/${type}] ${to} — gönderim hatası: ${err.message}`);
        await logEmail({
            toAddress: String(to).slice(0, 500),
            subject: String(subject || '').slice(0, 500),
            type,
            status: 'failed',
            errorMessage: err.message,
            relatedId,
            metadata,
            campaignId,
            variant,
        });
        return { success: false, error: err.message };
    }
}

/**
 * Bir kullanıcı için (yoksa üretip kaydederek) unsubscribe token döner.
 * Marketing maillerinin altına eklenecek URL'i bu token'la kuruyoruz.
 */
async function ensureUserUnsubscribeToken(user) {
    if (user.unsubscribeToken) return user.unsubscribeToken;
    const crypto = require('crypto');
    const token = crypto.randomBytes(24).toString('hex');
    await user.update({ unsubscribeToken: token });
    return token;
}

function buildUnsubscribeUrl(token, source = 'user') {
    return `${getFrontendUrl()}/abonelikten-cik/${token}?src=${encodeURIComponent(source)}`;
}

module.exports = {
    sendMail,
    getMailMeta,
    getFrontendUrl,
    getBackendPublicUrl,
    ensureUserUnsubscribeToken,
    buildUnsubscribeUrl,
};
