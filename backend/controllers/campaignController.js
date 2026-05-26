const { Op } = require('sequelize');
const User = require('../models/User');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const EmailLog = require('../models/EmailLog');
const Campaign = require('../models/Campaign');
const Coupon = require('../models/Coupon');
const {
    sendMail,
    getMailMeta,
    getFrontendUrl,
    ensureUserUnsubscribeToken,
    buildUnsubscribeUrl,
} = require('../services/mailer');
const campaignTemplate = require('../services/emailTemplates/campaign');
const { logAdminAudit } = require('../services/auditService');
const {
    buildMarketingVars,
    SAMPLE_VARS,
} = require('../services/emailTemplateInterpolator');
const { usersWantCampaignOffersClause } = require('../services/userEmailConsent');

function normalizeEmail(e) {
    return String(e || '').trim().toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIENCE
// ─────────────────────────────────────────────────────────────────────────────

async function resolveAudience(audience) {
    const recipients = new Map();

    if (audience === 'all_consenting' || audience === 'both') {
        const users = await User.findAll({
            where: usersWantCampaignOffersClause(),
            attributes: [
                'id',
                'fullName',
                'email',
                'unsubscribeToken',
                'marketingConsent',
                'emailConsentOffers',
            ],
        });
        for (const u of users) {
            if (!u.email) continue;
            recipients.set(u.email.toLowerCase(), {
                email: u.email,
                name: u.fullName,
                kind: 'user',
                userInstance: u,
            });
        }
    }

    if (audience === 'newsletter' || audience === 'both') {
        const subs = await NewsletterSubscriber.findAll({
            where: { status: 'active' },
            attributes: ['id', 'email', 'unsubscribeToken'],
        });
        for (const s of subs) {
            if (!s.email) continue;
            const key = s.email.toLowerCase();
            if (recipients.has(key)) continue;
            recipients.set(key, {
                email: s.email,
                name: null,
                kind: 'newsletter',
                unsubscribeToken: s.unsubscribeToken,
            });
        }
    }

    if (audience === 'all_users') {
        const users = await User.findAll({
            attributes: ['id', 'fullName', 'email', 'unsubscribeToken', 'marketingConsent'],
        });
        for (const u of users) {
            if (!u.email) continue;
            recipients.set(u.email.toLowerCase(), {
                email: u.email,
                name: u.fullName,
                kind: 'user',
                userInstance: u,
            });
        }
    }

    return Array.from(recipients.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIENCE STATS
// ─────────────────────────────────────────────────────────────────────────────

exports.audienceStats = async (req, res) => {
    try {
        const allConsenting = await User.count({ where: usersWantCampaignOffersClause() });
        const allUsers = await User.count();
        const activeNewsletter = await NewsletterSubscriber.count({ where: { status: 'active' } });
        const pendingNewsletter = await NewsletterSubscriber.count({ where: { status: 'pending' } });

        const consentingUsers = await User.findAll({
            where: usersWantCampaignOffersClause(),
            attributes: ['email'],
        });
        const activeSubs = await NewsletterSubscriber.findAll({
            where: { status: 'active' },
            attributes: ['email'],
        });
        const emails = new Set();
        consentingUsers.forEach((u) => u.email && emails.add(u.email.toLowerCase()));
        activeSubs.forEach((s) => s.email && emails.add(s.email.toLowerCase()));
        const both = emails.size;

        res.status(200).json({
            status: 'success',
            data: {
                all_consenting: allConsenting,
                newsletter: activeNewsletter,
                both,
                all_users: allUsers,
                pending_newsletter: pendingNewsletter,
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND TEST
// ─────────────────────────────────────────────────────────────────────────────

exports.sendTest = async (req, res) => {
    try {
        const { to, title, bodyHtml, ctaText, ctaUrl, couponId } = req.body;
        if (!to || !title || !bodyHtml) {
            return res.status(400).json({ status: 'fail', message: 'to, title ve bodyHtml zorunlu.' });
        }

        const meta = await getMailMeta();
        const frontendUrl = getFrontendUrl();
        const unsubscribeUrl = `${frontendUrl}/abonelikten-cik/test`;

        let coupon = null;
        if (couponId) {
            const c = await Coupon.findByPk(couponId);
            if (c) coupon = { code: c.code, discountPercent: c.discountPercent, expiresAt: c.expiresAt };
        }

        let templateVars = null;
        const testUser = await User.findOne({
            where: { email: normalizeEmail(to) },
            attributes: ['fullName', 'email'],
        });
        if (testUser) {
            templateVars = buildMarketingVars({
                recipientName: testUser.fullName,
                email: testUser.email,
                storeName: meta.storeName,
                frontendUrl,
                unsubscribeUrl,
                couponCode: coupon?.code || '',
            });
        } else {
            templateVars = {
                ...SAMPLE_VARS,
                ...buildMarketingVars({
                    recipientName: SAMPLE_VARS.tam_ad.split(/\s+/)[0] || SAMPLE_VARS.ad,
                    email: normalizeEmail(to),
                    storeName: meta.storeName,
                    frontendUrl,
                    unsubscribeUrl,
                    couponCode: coupon?.code || '',
                }),
            };
        }

        const tpl = campaignTemplate({
            title,
            bodyHtml,
            ctaText,
            ctaUrl,
            recipientName: null,
            storeName: meta.storeName,
            logoUrl: meta.logoUrl,
            unsubscribeUrl,
            coupon,
            templateVars,
        });

        const result = await sendMail({
            to,
            ...tpl,
            type: 'campaign',
            metadata: { test: true, audience: 'test', hasCoupon: !!coupon },
        });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'campaign.send_test',
            entityType: 'campaign',
            entityId: null,
            meta: { to, title, success: result.success },
        });

        res.status(200).json({
            status: result.success ? 'success' : 'fail',
            message: result.success
                ? `Test maili ${to} adresine gönderildi.`
                : `Test maili gönderilemedi: ${result.error}`,
            previewUrl: result.previewUrl || null,
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Şablon dokümantasyon + HTML önizleme (SMTP göndermez)
// ─────────────────────────────────────────────────────────────────────────────

exports.templateVariables = (_req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            intro:
                'Konu başlığı ve HTML gövdesinde {{örnek_alan}} sözdizimini kullanın. '
                + 'Alan değerleri otomatik kaçışlanır. Sipariş alanları şu an kampanya bağlamında boştur (ileride sipariş tetiklemelerinde dolacaktır).',
            tokens: [
                { token: '{{ad}}', key: 'ad', description: 'Alıcı adı / ilk kelime', sample: SAMPLE_VARS.ad },
                { token: '{{tam_ad}}', key: 'tam_ad', description: 'Tam ad', sample: SAMPLE_VARS.tam_ad },
                { token: '{{eposta}}', key: 'eposta', description: 'Alıcı e-postası', sample: SAMPLE_VARS.eposta },
                { token: '{{magaza}}', key: 'magaza', description: 'Mağaza adı', sample: SAMPLE_VARS.magaza },
                { token: '{{magaza_link}}', key: 'magaza_link', description: 'Site kök bağlantısı', sample: SAMPLE_VARS.magaza_link },
                { token: '{{abonelik_iptali}}', key: 'abonelik_iptali', description: 'Liste dışına çık bağlantısı', sample: '…/abonelikten-cik/…' },
                { token: '{{siparis_no}}', key: 'siparis_no', description: 'Son sipariş no (kampanyada çoğu zaman boş)', sample: SAMPLE_VARS.siparis_no },
                { token: '{{siparis_tutari}}', key: 'siparis_tutari', description: 'Sipariş tutarı (kampanyada boş olabilir)', sample: SAMPLE_VARS.siparis_tutari },
                { token: '{{kupon_code}}', key: 'kupon_code', description: 'İlişkili kupon kodu seçildiyse', sample: '' },
            ],
            sampleBundle: SAMPLE_VARS,
        },
    });
};

exports.previewCampaign = async (req, res) => {
    try {
        const { title, bodyHtml, ctaText, ctaUrl, couponId, sampleEmail } = req.body || {};
        if (!title || !bodyHtml) {
            return res.status(400).json({ status: 'fail', message: 'title ve bodyHtml zorunludur.' });
        }

        const meta = await getMailMeta();
        const frontendUrl = getFrontendUrl();
        const unsubscribeUrl = `${frontendUrl}/abonelikten-cik/preview`;

        let coupon = null;
        if (couponId) {
            const c = await Coupon.findByPk(couponId);
            if (c) coupon = { code: c.code, discountPercent: c.discountPercent, expiresAt: c.expiresAt };
        }

        let templateVars;
        const em = sampleEmail ? normalizeEmail(sampleEmail) : '';
        const sampleUser = em
            ? await User.findOne({ where: { email: em }, attributes: ['fullName', 'email'] })
            : null;

        if (sampleUser) {
            templateVars = buildMarketingVars({
                recipientName: sampleUser.fullName,
                email: sampleUser.email,
                storeName: meta.storeName,
                frontendUrl,
                unsubscribeUrl,
                couponCode: coupon?.code || '',
            });
        } else {
            templateVars = {
                ...SAMPLE_VARS,
                ...buildMarketingVars({
                    recipientName: SAMPLE_VARS.tam_ad,
                    email: SAMPLE_VARS.eposta,
                    storeName: meta.storeName,
                    frontendUrl,
                    unsubscribeUrl,
                    couponCode: coupon?.code || '',
                }),
            };
        }

        const tpl = campaignTemplate({
            title,
            bodyHtml,
            ctaText,
            ctaUrl,
            recipientName: null,
            storeName: meta.storeName,
            logoUrl: meta.logoUrl,
            unsubscribeUrl,
            coupon,
            templateVars,
        });

        res.status(200).json({
            status: 'success',
            data: { subject: tpl.subject, html: tpl.html },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CAMPAIGN
//   - mode='now'      → Campaign kaydı oluştur + hemen gönder (status=sending→sent)
//   - mode='schedule' → Campaign kaydı oluştur (status=scheduled, scheduledAt set)
//   - mode='draft'    → Campaign kaydı oluştur (status=draft)
// ─────────────────────────────────────────────────────────────────────────────

exports.createCampaign = async (req, res) => {
    try {
        const {
            mode = 'now',
            title,
            bodyHtml,
            ctaText,
            ctaUrl,
            audience = 'all_consenting',
            scheduledAt,
            couponId,
            abTestEnabled,
            variantBTitle,
            variantBBodyHtml,
            abSplitPercent,
        } = req.body;

        if (!title || !bodyHtml) {
            return res.status(400).json({ status: 'fail', message: 'title ve bodyHtml zorunlu.' });
        }

        if (mode === 'schedule') {
            if (!scheduledAt) {
                return res.status(400).json({ status: 'fail', message: 'Zamanlama için scheduledAt zorunlu.' });
            }
            const when = new Date(scheduledAt);
            if (Number.isNaN(when.getTime())) {
                return res.status(400).json({ status: 'fail', message: 'Geçersiz scheduledAt.' });
            }
            if (when.getTime() < Date.now() - 60_000) {
                return res.status(400).json({ status: 'fail', message: 'scheduledAt geçmişte olamaz.' });
            }
        }

        if (couponId) {
            const c = await Coupon.findByPk(couponId);
            if (!c) {
                return res.status(400).json({ status: 'fail', message: 'Seçilen kupon bulunamadı.' });
            }
        }

        if (abTestEnabled) {
            if (!variantBTitle || !variantBBodyHtml) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'A/B test için variant B başlık ve içerik zorunlu.',
                });
            }
        }

        const status = mode === 'schedule' ? 'scheduled' : mode === 'draft' ? 'draft' : 'sending';

        const campaign = await Campaign.create({
            title,
            bodyHtml,
            ctaText: ctaText || null,
            ctaUrl: ctaUrl || null,
            audience,
            status,
            type: 'manual',
            scheduledAt: mode === 'schedule' ? new Date(scheduledAt) : null,
            couponId: couponId || null,
            abTestEnabled: !!abTestEnabled,
            variantBTitle: abTestEnabled ? variantBTitle : null,
            variantBBodyHtml: abTestEnabled ? variantBBodyHtml : null,
            abSplitPercent: abTestEnabled ? Math.min(95, Math.max(5, parseInt(abSplitPercent, 10) || 50)) : 50,
        });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'campaign.create',
            entityType: 'campaign',
            entityId: campaign.id,
            meta: { mode, title: campaign.title, audience: campaign.audience },
        });

        if (mode === 'now') {
            // Yanıtı hemen ver, gönderimi arka planda başlat
            res.status(202).json({
                status: 'accepted',
                message: 'Kampanya gönderimi başlatıldı.',
                data: { campaign },
            });
            executeCampaign(campaign).catch((e) => console.error('executeCampaign error:', e.message));
            return;
        }

        if (mode === 'schedule') {
            return res.status(201).json({
                status: 'success',
                message: `Kampanya zamanlandı: ${new Date(scheduledAt).toLocaleString('tr-TR')}`,
                data: { campaign },
            });
        }

        return res.status(201).json({
            status: 'success',
            message: 'Kampanya taslak olarak kaydedildi.',
            data: { campaign },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE CAMPAIGN (internal, scheduler ve send-now için ortak)
// ─────────────────────────────────────────────────────────────────────────────

async function executeCampaign(campaign) {
    // Reload to ensure we have fresh state
    await campaign.reload();

    if (campaign.status !== 'sending') {
        await campaign.update({ status: 'sending' });
    }

    try {
        const recipients = await resolveAudience(campaign.audience);
        if (recipients.length === 0) {
            await campaign.update({ status: 'sent', sentAt: new Date(), totalRecipients: 0 });
            console.log(`📭 Kampanya ${campaign.id}: alıcı yok, sent olarak kapatıldı.`);
            return;
        }

        let coupon = null;
        if (campaign.couponId) {
            const c = await Coupon.findByPk(campaign.couponId);
            if (c) coupon = { code: c.code, discountPercent: c.discountPercent, expiresAt: c.expiresAt };
        }

        const meta = await getMailMeta();
        const frontendUrl = getFrontendUrl();
        await campaign.update({ totalRecipients: recipients.length });

        // A/B test: kitleyi rastgele iki gruba böl
        const useAB = !!campaign.abTestEnabled;
        const splitA = Math.max(5, Math.min(95, campaign.abSplitPercent || 50));

        let sent = 0, failed = 0;
        let aSent = 0, aFailed = 0, bSent = 0, bFailed = 0;

        for (let i = 0; i < recipients.length; i++) {
            const r = recipients[i];

            // A/B variant kararı — kullanıcının email hash'iyle deterministik:
            // hash(email) % 100 < splitA → A, aksi B
            let variant = null;
            let useTitle = campaign.title;
            let useBody = campaign.bodyHtml;
            if (useAB) {
                const hashed = simpleHash(r.email);
                const isA = (hashed % 100) < splitA;
                variant = isA ? 'A' : 'B';
                if (!isA) {
                    useTitle = campaign.variantBTitle || campaign.title;
                    useBody = campaign.variantBBodyHtml || campaign.bodyHtml;
                }
            }

            try {
                let unsubscribeUrl;
                if (r.kind === 'user') {
                    const token = await ensureUserUnsubscribeToken(r.userInstance);
                    unsubscribeUrl = buildUnsubscribeUrl(token, 'user');
                } else {
                    unsubscribeUrl = buildUnsubscribeUrl(r.unsubscribeToken, 'newsletter');
                }

                const tpl = campaignTemplate({
                    title: useTitle,
                    bodyHtml: useBody,
                    ctaText: campaign.ctaText,
                    ctaUrl: campaign.ctaUrl,
                    recipientName: r.name,
                    storeName: meta.storeName,
                    logoUrl: meta.logoUrl,
                    unsubscribeUrl,
                    coupon,
                    templateVars: buildMarketingVars({
                        recipientName: r.name,
                        email: r.email,
                        storeName: meta.storeName,
                        frontendUrl,
                        unsubscribeUrl,
                        couponCode: coupon?.code || '',
                    }),
                });

                const out = await sendMail({
                    to: r.email,
                    ...tpl,
                    type: 'campaign',
                    relatedId: campaign.id,
                    campaignId: campaign.id,
                    variant,
                    metadata: { audience: campaign.audience, kind: r.kind, variant },
                    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
                });

                if (out.success) {
                    sent += 1;
                    if (variant === 'A') aSent += 1;
                    else if (variant === 'B') bSent += 1;
                } else {
                    failed += 1;
                    if (variant === 'A') aFailed += 1;
                    else if (variant === 'B') bFailed += 1;
                }

                await new Promise((rsv) => setTimeout(rsv, 120));
            } catch (e) {
                failed += 1;
                if (variant === 'A') aFailed += 1;
                else if (variant === 'B') bFailed += 1;
                console.error('campaign loop:', e.message);
            }
        }

        await campaign.update({
            status: 'sent',
            sentAt: new Date(),
            sentCount: sent,
            failedCount: failed,
            variantASent: aSent,
            variantAFailed: aFailed,
            variantBSent: bSent,
            variantBFailed: bFailed,
        });

        console.log(`✅ Kampanya ${campaign.id} bitti: sent=${sent}  failed=${failed}  (A=${aSent}/${aFailed}, B=${bSent}/${bFailed})`);
    } catch (err) {
        await campaign.update({ status: 'failed', metadata: { error: err.message } }).catch(() => {});
        console.error(`❌ executeCampaign failed (${campaign.id}):`, err.message);
        throw err;
    }
}

function simpleHash(str) {
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

exports.listCampaigns = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const status = req.query.status;
        const where = {};
        if (status) where.status = status;

        const rows = await Campaign.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
        });

        res.status(200).json({ status: 'success', data: { campaigns: rows } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE
// ─────────────────────────────────────────────────────────────────────────────

exports.getCampaign = async (req, res) => {
    try {
        const c = await Campaign.findByPk(req.params.id);
        if (!c) return res.status(404).json({ status: 'fail', message: 'Kampanya bulunamadı.' });
        res.status(200).json({ status: 'success', data: { campaign: c } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND NOW (zamanlanmış bir kampanyayı hemen tetikle)
// ─────────────────────────────────────────────────────────────────────────────

exports.sendNow = async (req, res) => {
    try {
        const c = await Campaign.findByPk(req.params.id);
        if (!c) return res.status(404).json({ status: 'fail', message: 'Kampanya bulunamadı.' });
        if (!['scheduled', 'draft', 'failed'].includes(c.status)) {
            return res.status(400).json({ status: 'fail', message: `Bu kampanya zaten ${c.status} durumunda.` });
        }
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'campaign.send_now',
            entityType: 'campaign',
            entityId: c.id,
            meta: { title: c.title, previousStatus: c.status },
        });
        res.status(202).json({ status: 'accepted', message: 'Kampanya gönderimi başlatıldı.' });
        executeCampaign(c).catch((e) => console.error('manual send-now:', e.message));
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL
// ─────────────────────────────────────────────────────────────────────────────

exports.cancelCampaign = async (req, res) => {
    try {
        const c = await Campaign.findByPk(req.params.id);
        if (!c) return res.status(404).json({ status: 'fail', message: 'Kampanya bulunamadı.' });
        if (!['scheduled', 'draft'].includes(c.status)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Sadece taslak veya zamanlanmış kampanyalar iptal edilebilir.',
            });
        }
        await c.update({ status: 'cancelled' });
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'campaign.cancel',
            entityType: 'campaign',
            entityId: c.id,
            meta: { title: c.title },
        });
        res.status(200).json({ status: 'success', message: 'Kampanya iptal edildi.', data: { campaign: c } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGS
// ─────────────────────────────────────────────────────────────────────────────

exports.listLogs = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
        const offset = parseInt(req.query.offset, 10) || 0;
        const type = req.query.type;
        const status = req.query.status;
        const campaignId = req.query.campaignId;

        const where = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (campaignId) where.campaignId = campaignId;

        const rows = await EmailLog.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        const total = await EmailLog.count();
        const totalSuccess = await EmailLog.count({ where: { status: 'success' } });
        const totalFailed = await EmailLog.count({ where: { status: 'failed' } });
        const last7d = await EmailLog.count({
            where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        });

        res.status(200).json({
            status: 'success',
            data: {
                logs: rows.rows,
                pagination: { total: rows.count, limit, offset },
                stats: { total, totalSuccess, totalFailed, last7d },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// internal export — scheduler kullanıyor
exports._executeCampaign = executeCampaign;
