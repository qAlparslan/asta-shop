const healthService = require('../services/healthService');
const { verifySmtpConnection, sendMail, getMailMeta } = require('../services/mailer');
const User = require('../models/User');

exports.getLiveness = (req, res) => {
    res.status(200).json(healthService.getLiveness());
};

exports.getReadiness = async (req, res) => {
    const body = await healthService.getReadiness();
    const code = body.database === 'connected' ? 200 : 503;
    res.status(code).json(body);
};

/** Genişletilmiş durum — admin veya dahili izleme */
exports.getDetailed = async (req, res) => {
    try {
        const body = await healthService.getDetailedHealth();
        const code = body.status === 'ok' ? 200 : 503;
        res.status(code).json({ status: 'success', data: body });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message });
    }
};

/** SMTP verify — mail göndermez */
exports.mailPing = async (req, res) => {
    try {
        const result = await verifySmtpConnection();
        res.status(result.ok ? 200 : 503).json({
            status: result.ok ? 'success' : 'fail',
            data: result,
            message: result.ok
                ? 'SMTP bağlantısı doğrulandı.'
                : result.error || 'SMTP doğrulaması başarısız.',
        });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message });
    }
};

/**
 * Test maili gönderir (admin). Body: { to?: string }
 */
exports.mailTest = async (req, res) => {
    try {
        let to = String(req.body?.to || '').trim();
        if (!to) {
            to = String(req.user?.email || '').trim();
        }
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Geçerli bir alıcı e-postası gerekli (body.to veya admin hesabı).',
            });
        }

        const ping = await verifySmtpConnection();
        if (!ping.ok) {
            return res.status(503).json({
                status: 'fail',
                message: 'SMTP doğrulaması geçmedi; test maili gönderilmedi.',
                data: ping,
            });
        }

        const meta = await getMailMeta();
        const subject = `[${meta.storeName}] Sağlık kontrolü test maili`;
        const html = `
          <p>Bu mesaj <strong>/api/health/mail/test</strong> uç noktasından gönderildi.</p>
          <p>Zaman: ${new Date().toISOString()}</p>
          <p>SMTP modu: <code>${ping.mode}</code></p>
        `;

        const result = await sendMail({
            to,
            subject,
            html,
            type: 'healthCheck',
            relatedId: req.user?.id || null,
            metadata: { triggeredBy: req.user?.email },
        });

        if (!result.success) {
            return res.status(502).json({
                status: 'fail',
                message: result.error || 'Test maili gönderilemedi.',
                data: { smtp: ping },
            });
        }

        res.status(200).json({
            status: 'success',
            message: `Test maili ${to} adresine gönderildi.`,
            data: {
                to,
                previewUrl: result.previewUrl || null,
                transportMode: ping.mode,
            },
        });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message });
    }
};

/** İsteğe bağlı: admin alıcı listesi önizlemesi */
exports.mailRecipientsHint = async (_req, res) => {
    try {
        const fromEnv = (process.env.ADMIN_NOTIFICATION_EMAIL || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const admins = await User.findAll({
            where: { role: 'admin' },
            attributes: ['email'],
        });
        const adminEmails = admins.map((a) => a.email).filter(Boolean);
        res.status(200).json({
            status: 'success',
            data: {
                envRecipients: fromEnv,
                adminUserEmails: adminEmails,
                note: 'Sipariş bildirimleri önce ADMIN_NOTIFICATION_EMAIL, yoksa admin kullanıcı e-postalarını kullanır.',
            },
        });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message });
    }
};
