const { Op } = require('sequelize');
const User = require('../models/User');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const EmailLog = require('../models/EmailLog');
const EmailAutomation = require('../models/EmailAutomation');
const {
    sendMail,
    getMailMeta,
    getFrontendUrl,
    ensureUserUnsubscribeToken,
    buildUnsubscribeUrl,
} = require('./mailer');
const campaignTemplate = require('./emailTemplates/campaign');
const { buildMarketingVars } = require('./emailTemplateInterpolator');
const { usersWantCampaignOffersClause } = require('./userEmailConsent');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Admin panelinden yönetilen otomatik e-posta kuralları (EmailAutomation tablosu).
 * Kurallar artık koda gömülü değil; admin oluşturur/düzenler/aç-kapatır.
 *
 * Tetikleyiciler:
 *   days_after_signup_no_order → kayıttan N gün sonra, hiç sipariş vermemişlere
 *   days_after_last_order      → son siparişten N gün sonra (geri kazanım)
 *
 * Tekilleştirme: EmailLog.relatedId = `auto:<automationId>:<userId>`
 *   once      → bu kayıt varsa bir daha gönderme
 *   recurring → son gönderim repeatDays günden eskiyse tekrar gönder
 */

const DEFAULT_AUTOMATIONS = [
    {
        name: 'Hoş geldin — ilk sipariş teşviki',
        enabled: false,
        triggerType: 'days_after_signup_no_order',
        triggerDays: 7,
        subject: 'Sana özel bir hediyemiz var',
        bodyHtml:
            '<p>Bizi keşfettiğin için teşekkür ederiz. Hâlâ ilk siparişini vermediğini fark ettik — ' +
            'doğal güzellik koleksiyonumuza bir göz atmak ister misin?</p>' +
            '<p>Yeni başlayanlar için <strong>özel önerilerimiz</strong> hazır.</p>',
        ctaText: 'Mağazayı Keşfet',
        ctaPath: '/urunler',
        repeatMode: 'once',
        repeatDays: null,
    },
    {
        name: 'Geri kazanım — seni özledik',
        enabled: false,
        triggerType: 'days_after_last_order',
        triggerDays: 30,
        subject: 'Seni özledik',
        bodyHtml:
            '<p>Son siparişinin üzerinden bir süre geçti. Doğal koleksiyonumuza yeni ürünler eklendi — ' +
            'tekrar geldiğinde sana özel sürprizler hazırladık.</p>' +
            '<p>Senin için seçtiğimiz <strong>en sevilen ürünleri</strong> incelemeye ne dersin?</p>',
        ctaText: 'Yeniliklere Bak',
        ctaPath: '/urunler',
        repeatMode: 'recurring',
        repeatDays: 45,
    },
];

let timer = null;
let busy = false;

async function seedDefaultAutomations() {
    try {
        const count = await EmailAutomation.count();
        if (count > 0) return;
        for (const a of DEFAULT_AUTOMATIONS) {
            await EmailAutomation.create(a);
        }
        console.log(`🤖 ${DEFAULT_AUTOMATIONS.length} örnek otomatik e-posta kuralı oluşturuldu (kapalı — panelden açın).`);
    } catch (e) {
        if (!/no such table|doesn't exist|ER_NO_SUCH_TABLE/i.test(String(e.message))) {
            console.warn('Otomatik e-posta seed atlandı:', e.message);
        }
    }
}

/** Kuralın tetikleyicisine göre aday kullanıcıları döndürür. */
async function getCandidates(a) {
    const cutoff = new Date(Date.now() - Math.max(0, Number(a.triggerDays) || 0) * DAY_MS);

    if (a.triggerType === 'days_after_signup_no_order') {
        const users = await User.findAll({
            where: {
                role: 'customer',
                ...usersWantCampaignOffersClause(),
                createdAt: { [Op.lte]: cutoff },
            },
            attributes: ['id', 'fullName', 'email', 'unsubscribeToken', 'createdAt'],
        });
        const filtered = [];
        for (const u of users) {
            const orderCount = await Order.count({ where: { email: u.email } });
            if (orderCount === 0) filtered.push(u);
        }
        return filtered;
    }

    if (a.triggerType === 'days_after_last_order') {
        const users = await User.findAll({
            where: { role: 'customer', ...usersWantCampaignOffersClause() },
            attributes: ['id', 'fullName', 'email', 'unsubscribeToken'],
        });
        const filtered = [];
        for (const u of users) {
            const lastOrder = await Order.findOne({
                where: { email: u.email },
                order: [['createdAt', 'DESC']],
            });
            if (lastOrder && lastOrder.createdAt < cutoff) filtered.push(u);
        }
        return filtered;
    }

    return [];
}

/** Bu kuralla daha önce (uygun pencerede) mail almış kullanıcıların anahtar kümesi. */
async function buildSeenSet(a) {
    const prefix = `auto:${a.id}:`;
    const where = {
        type: 'campaign',
        relatedId: { [Op.like]: `${prefix}%` },
    };
    // recurring: yalnızca son repeatDays içinde gönderilmişler "görülmüş" sayılır (soğuma)
    if (a.repeatMode === 'recurring') {
        const gapDays = Math.max(1, Number(a.repeatDays) || 30);
        where.createdAt = { [Op.gte]: new Date(Date.now() - gapDays * DAY_MS) };
    }
    const rows = await EmailLog.findAll({ where, attributes: ['relatedId'] });
    return new Set(rows.map((r) => r.relatedId));
}

function isWithinWindow(a, now = new Date()) {
    if (a.startAt && now < new Date(a.startAt)) return false;
    if (a.endAt && now > new Date(a.endAt)) return false;
    return true;
}

async function processAutomation(a) {
    if (!a.enabled) return { id: a.id, sent: 0, skipped: 0, reason: 'disabled' };
    if (!isWithinWindow(a)) return { id: a.id, sent: 0, skipped: 0, reason: 'out-of-window' };

    const meta = await getMailMeta();
    const frontend = getFrontendUrl();
    const candidates = await getCandidates(a);

    if (candidates.length === 0) {
        await a.update({ lastRunAt: new Date(), lastSentCount: 0 });
        return { id: a.id, sent: 0, skipped: 0 };
    }

    const seen = await buildSeenSet(a);
    const prefix = `auto:${a.id}:`;

    const campaign = await Campaign.create({
        title: a.subject,
        bodyHtml: a.bodyHtml,
        ctaText: a.ctaText,
        ctaUrl: a.ctaPath ? `${frontend}${a.ctaPath}` : null,
        audience: 'all_consenting',
        status: 'sending',
        type: 'automated',
        automatedRule: a.id,
        totalRecipients: candidates.length,
    });

    let sent = 0;
    let skipped = 0;

    for (const u of candidates) {
        const key = `${prefix}${u.id}`;
        if (seen.has(key)) {
            skipped += 1;
            continue;
        }
        try {
            const token = await ensureUserUnsubscribeToken(u);
            const unsubscribeUrl = buildUnsubscribeUrl(token, 'user');
            const tpl = campaignTemplate({
                title: a.subject,
                bodyHtml: a.bodyHtml,
                ctaText: a.ctaText,
                ctaUrl: a.ctaPath ? `${frontend}${a.ctaPath}` : null,
                recipientName: u.fullName,
                storeName: meta.storeName,
                logoUrl: meta.logoUrl,
                unsubscribeUrl,
                templateVars: buildMarketingVars({
                    recipientName: u.fullName,
                    email: u.email,
                    storeName: meta.storeName,
                    frontendUrl: frontend,
                    unsubscribeUrl,
                }),
            });
            const out = await sendMail({
                to: u.email,
                ...tpl,
                type: 'campaign',
                relatedId: key,
                campaignId: campaign.id,
                metadata: { automationId: a.id, automated: true },
                headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
            });
            if (out.success) sent += 1;
            await new Promise((r) => setTimeout(r, 200));
        } catch (e) {
            console.error(`otomasyon ${a.id} loop:`, e.message);
        }
    }

    await campaign.update({
        status: 'sent',
        sentAt: new Date(),
        sentCount: sent,
        failedCount: candidates.length - sent - skipped,
        metadata: { automationId: a.id, skipped },
    });
    await a.update({ lastRunAt: new Date(), lastSentCount: sent });

    console.log(`🤖 Otomasyon [${a.name}]: aday=${candidates.length}, gönderildi=${sent}, atlandı=${skipped}`);
    return { id: a.id, sent, skipped };
}

async function tick() {
    if (busy) return;
    busy = true;
    try {
        const automations = await EmailAutomation.findAll({ where: { enabled: true } });
        for (const a of automations) {
            try {
                await processAutomation(a);
            } catch (e) {
                console.error(`Otomasyon [${a.id}] hatası:`, e.message);
            }
        }
    } catch (e) {
        if (!/no such table|doesn't exist|ER_NO_SUCH_TABLE/i.test(String(e.message))) {
            console.error('automatedReminders.tick hatası:', e.message);
        }
    } finally {
        busy = false;
    }
}

function start() {
    if (timer) return;
    const intervalMs = parseInt(process.env.AUTOMATED_REMINDER_INTERVAL_MS, 10) || (24 * 60 * 60 * 1000); // 24 saat
    const bootDelayMs = parseInt(process.env.AUTOMATED_REMINDER_BOOT_DELAY_MS, 10) || (5 * 60 * 1000); // 5 dk
    console.log(
        `🤖 Otomatik e-posta motoru aktif (${Math.round(intervalMs / 60000)}dk aralık, ` +
        `ilk tur ${Math.round(bootDelayMs / 60000)}dk sonra).`,
    );
    seedDefaultAutomations().catch(() => {});
    setTimeout(tick, bootDelayMs);
    timer = setInterval(tick, intervalMs);
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

module.exports = { start, stop, _processAutomation: processAutomation, seedDefaultAutomations, _tick: tick };
