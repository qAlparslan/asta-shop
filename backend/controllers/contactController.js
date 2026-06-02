const ContactMessage = require('../models/ContactMessage');
const SiteSetting = require('../models/SiteSetting');
const { sendMail } = require('../services/mailer');

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clamp = (v, n) => String(v ?? '').trim().slice(0, n);

const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
    );

async function resolveRecipient() {
    try {
        const row = await SiteSetting.findOne({ where: { key: 'footerEmail' } });
        const v = row && typeof row.value === 'string' ? row.value.trim() : '';
        if (v && EMAIL_RX.test(v)) return v;
    } catch {
        /* ayar okunamazsa env'e düş */
    }
    const env = (
        process.env.CONTACT_RECIPIENT ||
        process.env.MAIL_FROM_ADDRESS ||
        process.env.SMTP_USER ||
        ''
    ).trim();
    return env && EMAIL_RX.test(env) ? env : '';
}

// POST /api/contact — public iletişim formu
exports.submit = async (req, res) => {
    try {
        const name = clamp(req.body?.name, 150);
        const email = clamp(req.body?.email, 254).toLowerCase();
        const subject = clamp(req.body?.subject, 200);
        const message = clamp(req.body?.message, 5000);

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ status: 'fail', message: 'Lütfen tüm alanları doldurun.' });
        }
        if (!EMAIL_RX.test(email)) {
            return res.status(400).json({ status: 'fail', message: 'Geçerli bir e-posta adresi girin.' });
        }
        if (message.length < 10) {
            return res.status(400).json({ status: 'fail', message: 'Mesajınız çok kısa (en az 10 karakter).' });
        }

        const ipAddress = String(req.ip || req.socket?.remoteAddress || '').slice(0, 64);
        const row = await ContactMessage.create({ name, email, subject, message, ipAddress, status: 'new' });

        const to = await resolveRecipient();
        let mailOk = false;
        if (to) {
            const html = `
                <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6">
                    <h2 style="margin:0 0 12px;color:#0f2747">Yeni iletişim formu mesajı</h2>
                    <table style="border-collapse:collapse;font-size:14px">
                        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Ad soyad</td><td><strong>${escapeHtml(name)}</strong></td></tr>
                        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">E-posta</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
                        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Konu</td><td>${escapeHtml(subject)}</td></tr>
                    </table>
                    <p style="margin:16px 0 6px;color:#6b7280;font-size:13px">Mesaj:</p>
                    <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;font-size:14px">${escapeHtml(message)}</div>
                    <p style="margin-top:18px;font-size:12px;color:#9ca3af">Yanıtlamak için bu e-postayı doğrudan yanıtlayabilirsiniz (Reply-To: gönderenin adresi).</p>
                </div>`;
            const result = await sendMail({
                to,
                subject: `İletişim formu: ${subject}`,
                html,
                type: 'contact',
                relatedId: row.id,
                headers: { 'Reply-To': `${name} <${email}>` },
                metadata: { name, email },
            });
            mailOk = Boolean(result && result.success);
        }

        await row.update({ status: mailOk ? 'notified' : 'failed' });

        // Mesaj DB'ye yazıldıysa kullanıcıya başarı dön — mail gidemese de talep kayıtlı.
        return res.json({
            status: 'success',
            message: 'Mesajınız bize ulaştı. En kısa sürede tarafınıza dönüş yapacağız.',
        });
    } catch (err) {
        return res
            .status(500)
            .json({ status: 'fail', message: 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
    }
};
