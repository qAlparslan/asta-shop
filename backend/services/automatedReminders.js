const { Op } = require('sequelize');
const User = require('../models/User');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const EmailLog = require('../models/EmailLog');
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

/**
 * Otomatik hatırlatma maillerini günde bir kez çalıştırır.
 *
 * Kurallar:
 *   - welcome_followup_7d:
 *       Kayıt olalı 7+ gün olmuş, kampanya/teklif e-postası onaylı,
 *       hiç sipariş vermemiş kullanıcılara "geri dön" maili.
 *
 *   - reactivation_30d:
 *       Son siparişinin üstünden 30+ gün geçmiş, kampanya/teklif onayı açık
 *       kullanıcılara "seni özledik" maili.
 *
 * Her kural için her kullanıcıya en fazla 1 kez gönderilir
 * (EmailLog'a relatedId=`${rule}:${userId}` olarak işaretlenir).
 */

const RULES = [
    {
        id: 'welcome_followup_7d',
        title: 'Sana özel bir hediyemiz var',
        body: `
            <p>Bizi keşfettiğin için teşekkür ederiz. Hâlâ ilk siparişini vermediğini fark ettik —
            doğal güzellik koleksiyonumuza bir göz atmak ister misin?</p>
            <p>Yeni başlayanlar için <strong>özel önerilerimiz</strong> hazır.</p>
        `,
        ctaText: 'Mağazayı Keşfet',
        ctaPath: '/urunler',
        getCandidates: async () => {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const users = await User.findAll({
                where: {
                    role: 'customer',
                    ...usersWantCampaignOffersClause(),
                    createdAt: { [Op.lte]: sevenDaysAgo },
                },
                attributes: ['id', 'fullName', 'email', 'unsubscribeToken', 'createdAt'],
            });
            // Hiç siparişi olmayanlar
            const filtered = [];
            for (const u of users) {
                const orderCount = await Order.count({ where: { email: u.email } });
                if (orderCount === 0) filtered.push(u);
            }
            return filtered;
        },
    },
    {
        id: 'reactivation_30d',
        title: 'Seni özledik',
        body: `
            <p>Son siparişinin üzerinden bir süre geçti. Doğal koleksiyonumuza yeni ürünler eklendi —
            tekrar geldiğinde sana özel sürprizler hazırladık.</p>
            <p>Senin için seçtiğimiz <strong>en sevilen ürünleri</strong> incelemeye ne dersin?</p>
        `,
        ctaText: 'Yeniliklere Bak',
        ctaPath: '/urunler',
        getCandidates: async () => {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            // Son siparişi 30+ gün önce olanları bul
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
                if (lastOrder && lastOrder.createdAt < thirtyDaysAgo) {
                    filtered.push(u);
                }
            }
            return filtered;
        },
    },
];

let timer = null;
let busy = false;

async function processRule(rule) {
    const meta = await getMailMeta();
    const frontend = getFrontendUrl();
    const candidates = await rule.getCandidates();
    if (candidates.length === 0) return { rule: rule.id, sent: 0, skipped: 0 };

    // Bu kuralla daha önce mail gönderilmiş kullanıcıları topla
    const alreadyKey = `auto:${rule.id}:`;
    const existing = await EmailLog.findAll({
        where: {
            type: 'campaign',
            relatedId: { [Op.like]: `${alreadyKey}%` },
        },
        attributes: ['relatedId'],
    });
    const seen = new Set(existing.map((e) => e.relatedId));

    // Campaign kaydı oluştur (özet için)
    const campaign = await Campaign.create({
        title: rule.title,
        bodyHtml: rule.body,
        ctaText: rule.ctaText,
        ctaUrl: `${frontend}${rule.ctaPath}`,
        audience: 'all_consenting',
        status: 'sending',
        type: 'automated',
        automatedRule: rule.id,
        totalRecipients: candidates.length,
    });

    let sent = 0;
    let skipped = 0;

    for (const u of candidates) {
        const key = `${alreadyKey}${u.id}`;
        if (seen.has(key)) {
            skipped += 1;
            continue;
        }
        try {
            const token = await ensureUserUnsubscribeToken(u);
            const unsubscribeUrl = buildUnsubscribeUrl(token, 'user');
            const tpl = campaignTemplate({
                title: rule.title,
                bodyHtml: rule.body,
                ctaText: rule.ctaText,
                ctaUrl: `${frontend}${rule.ctaPath}`,
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
                metadata: { rule: rule.id, automated: true },
                headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
            });
            if (out.success) sent += 1;
            await new Promise((r) => setTimeout(r, 200));
        } catch (e) {
            console.error(`${rule.id} loop:`, e.message);
        }
    }

    await campaign.update({
        status: 'sent',
        sentAt: new Date(),
        sentCount: sent,
        failedCount: candidates.length - sent - skipped,
        metadata: { rule: rule.id, skipped },
    });

    console.log(`🤖 Otomatik kural [${rule.id}]: candidates=${candidates.length}, sent=${sent}, skipped=${skipped}`);
    return { rule: rule.id, sent, skipped };
}

async function tick() {
    if (busy) return;
    busy = true;
    try {
        for (const rule of RULES) {
            try {
                await processRule(rule);
            } catch (e) {
                console.error(`Otomatik kural [${rule.id}] hatası:`, e.message);
            }
        }
    } finally {
        busy = false;
    }
}

function start() {
    if (timer) return;
    // Varsayılan: günde bir kez. Çok sık mail riskine karşı geniş aralık.
    const intervalMs = parseInt(process.env.AUTOMATED_REMINDER_INTERVAL_MS, 10) || (24 * 60 * 60 * 1000); // 24 saat
    // Boot/deploy sırasındaki yeniden başlatma dalgalarında hemen mail atmasın diye ilk tur gecikmeli.
    const bootDelayMs = parseInt(process.env.AUTOMATED_REMINDER_BOOT_DELAY_MS, 10) || (5 * 60 * 1000); // 5 dk
    console.log(
        `🤖 Otomatik hatırlatma sistemi aktif (${Math.round(intervalMs / 60000)}dk aralık, ` +
        `ilk tur ${Math.round(bootDelayMs / 60000)}dk sonra).`,
    );
    setTimeout(tick, bootDelayMs);
    timer = setInterval(tick, intervalMs);
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

module.exports = { start, stop, _processRule: processRule, _rules: RULES };
