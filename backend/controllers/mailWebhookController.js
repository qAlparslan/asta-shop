const crypto = require('crypto');
const EmailDeliveryFeedback = require('../models/EmailDeliveryFeedback');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const User = require('../models/User');

function normalizeEmail(e) {
    return String(e || '').trim().toLowerCase().slice(0, 320);
}

function timingSafeCompare(a, b) {
    const x = Buffer.from(String(a || ''));
    const y = Buffer.from(String(b || ''));
    if (x.length !== y.length) return false;
    return crypto.timingSafeEqual(x, y);
}

/**
 * Normalize edilmiş olayların listesinden kayıtları üret ve abonelikleri güvenli biçimde kapatır.
 *
 * Beklenen generic gövde (auth: Bearer MAIL_WEBHOOK_SECRET veya X-Mail-Webhook-Token başlığı):
 * {
 *   "provider": "sendgrid"|"ses"|"mailgun"|"generic",
 *   "events": [{ "kind": "bounce_hard"|"bounce_soft"|"complaint", "email":"a@b.com", "code":"", "detail":"" }]
 * }
 */
exports.ingestFeedback = async (req, res) => {
    const secret = process.env.MAIL_WEBHOOK_SECRET || '';
    if (!secret) {
        return res.status(503).json({
            status: 'fail',
            message: 'MAIL_WEBHOOK_SECRET yapılandırılmadı.',
        });
    }

    const bearer = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : '';
    const headerTok = req.headers['x-mail-webhook-token'];

    const okAuth =
        (bearer && timingSafeCompare(bearer, secret)) ||
        (headerTok && timingSafeCompare(headerTok, secret));

    if (!okAuth) {
        return res.status(401).json({ status: 'fail', message: 'Yetkisiz.' });
    }

    try {
        const body = req.body || {};
        const provider = String(body.provider || 'generic').slice(0, 40);

        /** @type {Array<{kind:string,email:string,code?:string,detail?:string,notificationId?:string}>} */
        let events = [];

        if (Array.isArray(body.events) && body.events.length) {
            events = body.events;
        }
        /** SendGrid lite normalizasyonu */
        else if (Array.isArray(body) && body[0]?.email != null && body[0]?.event != null) {
            events = body.map((ev) => {
                const evt = String(ev.event || '').toLowerCase();
                let kind = 'other';
                if (evt.includes('bounce')) kind = 'bounce_hard';
                if (evt.includes('dropped')) kind = 'bounce_soft';
                if (evt.includes('spamreport') || evt.includes('complaint')) kind = 'complaint';
                return {
                    email: normalizeEmail(ev.email),
                    kind,
                    detail: JSON.stringify(ev).slice(0, 2000),
                    notificationId: ev.sg_message_id ? String(ev.sg_message_id).slice(0, 200) : null,
                    raw: ev,
                };
            }).filter((e) => e.email);
        }

        if (!events.length) {
            return res.status(400).json({
                status: 'fail',
                message: 'İşlenecek olay bulunamadı. Beklenen: { provider, events: [...] } veya SendGrid webhook dizisi.',
            });
        }

        let stored = 0;
        let suppressedUsers = 0;
        let suppressedNewsletter = 0;

        for (const raw of events) {
            const email = normalizeEmail(raw.email);
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

            let kind = String(raw.kind || 'other').slice(0, 40).toLowerCase();

            await EmailDeliveryFeedback.create({
                recipientEmail: email,
                kind,
                provider,
                diagnosticCode: raw.code ? String(raw.code).slice(0, 120) : null,
                message: raw.detail ? String(raw.detail).slice(0, 8000) : null,
                notificationId: raw.notificationId ? String(raw.notificationId).slice(0, 200) : null,
                rawPayload:
                    typeof raw.raw === 'object' && raw.raw !== null
                        ? raw.raw
                        : { _: typeof raw.raw === 'string' ? raw.raw.slice(0, 5000) : raw },
            });
            stored += 1;

            if (
                ['bounce_hard', 'bounce_soft', 'complaint', 'spam', 'spamreport'].includes(kind) ||
                kind.includes('bounce') ||
                kind.includes('complaint')
            ) {
                const users = await User.findAll({
                    where: { email },
                });
                for (const u of users) {
                    await u.update({
                        emailConsentOffers: false,
                        emailConsentNewsletter: false,
                        marketingConsent: false,
                        marketingConsentAt: null,
                    });
                    suppressedUsers += 1;
                }

                const sub = await NewsletterSubscriber.findOne({ where: { email } });
                if (sub && sub.status !== 'unsubscribed') {
                    await sub.update({ status: 'unsubscribed', unsubscribedAt: new Date() });
                    suppressedNewsletter += 1;
                }
            }
        }

        return res.status(200).json({
            status: 'success',
            data: {
                accepted: stored,
                suppressedNewsletterSubscriptions: suppressedNewsletter,
                userMarketingOptOutRows: suppressedUsers,
            },
        });
    } catch (err) {
        return res.status(400).json({ status: 'fail', message: err.message });
    }
};
