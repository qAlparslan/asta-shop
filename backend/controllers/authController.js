const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op, Sequelize } = require('sequelize');
const User = require('../models/User');
const ConsentEvent = require('../models/ConsentEvent');
const { getMergedVersionPins } = require('../services/legalPagesMerge');
const { hashIp } = require('../services/auditService');
const { sendMail, getMailMeta, getFrontendUrl } = require('../services/mailer');
const welcomeTemplate = require('../services/emailTemplates/welcome');
const passwordResetTemplate = require('../services/emailTemplates/passwordReset');

const signToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });

// ─── REGISTER ────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            marketingConsent,
            emailConsentOffers,
            emailConsentNewsletter,
            privacyVersion,
            kvkkVersion,
            cookiePolicyVersion,
            termsOfUseVersion,
            visitorKey,
        } = req.body;

        const pins = await getMergedVersionPins();
        if (
            privacyVersion !== pins.privacyVersion ||
            kvkkVersion !== pins.kvkkVersion ||
            cookiePolicyVersion !== pins.cookiePolicyVersion ||
            termsOfUseVersion !== pins.termsOfUseVersion
        ) {
            return res.status(400).json({
                status: 'fail',
                message:
                    'Güncellenmiş aydınlatma metinleri yayınlandı. Sayfayı yenileyip kutucukları tekrar onaylayın.',
            });
        }

        const fullNameNorm = String(fullName || '').trim();
        const emailNorm = String(email || '').trim().toLowerCase();
        const passStr = String(password || '');

        if (!fullNameNorm || fullNameNorm.length > 100) {
            return res.status(400).json({
                status: 'fail',
                message: !fullNameNorm
                    ? 'Ad soyad zorunludur.'
                    : 'Ad soyad en fazla 100 karakter olabilir.',
            });
        }

        if (!emailNorm || emailNorm.length > 150) {
            return res.status(400).json({ status: 'fail', message: 'Geçerli bir e-posta adresi girin.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
            return res.status(400).json({ status: 'fail', message: 'Geçerli bir e-posta adresi girin.' });
        }

        if (!passStr || passStr.length < 8) {
            return res.status(400).json({
                status: 'fail',
                message: 'Şifre en az 8 karakter olmalıdır.',
            });
        }

        const legacyM = marketingConsent === true || marketingConsent === 'true';
        const offers =
            typeof emailConsentOffers !== 'undefined'
                ? emailConsentOffers === true || emailConsentOffers === 'true'
                : legacyM;
        const newsletters =
            typeof emailConsentNewsletter !== 'undefined'
                ? emailConsentNewsletter === true || emailConsentNewsletter === 'true'
                : legacyM;
        const anyMarketing = offers || newsletters;

        // Açık kayıtta rol istemciye güvenilmez; admin sadece DB / iç araçlarla atanır.
        const newUser = await User.create({
            fullName: fullNameNorm,
            email: emailNorm,
            password: passStr,
            role: 'customer',
            marketingConsent: anyMarketing,
            marketingConsentAt: anyMarketing ? new Date() : null,
            emailConsentOffers: offers,
            emailConsentNewsletter: newsletters,
        });

        const token = signToken(newUser.id, newUser.role);

        try {
            await ConsentEvent.create({
                userId: newUser.id,
                visitorKey: visitorKey ? String(visitorKey).slice(0, 64) : null,
                channel: 'registration',
                privacyVersion,
                kvkkVersion,
                cookiePolicyVersion,
                termsOfUseVersion,
                marketingAccepted: anyMarketing,
                cookiePreferences: { offers, newsletter: newsletters },
                collectionMethod: anyMarketing
                    ? `register_email_flags_${offers ? 'O' : 'o'}_${newsletters ? 'N' : 'n'}`
                    : 'register_email_flags_none',
                userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
                ipHash: hashIp(req.ip || req.socket?.remoteAddress),
            });
        } catch (ce) {
            console.error('consent event (register):', ce.message);
        }

        // Hoş geldin maili — fire-and-forget, isteği bekletmez
        (async () => {
            try {
                const meta = await getMailMeta();
                const tpl = welcomeTemplate({
                    fullName: newUser.fullName,
                    storeName: meta.storeName,
                    logoUrl: meta.logoUrl,
                    frontendUrl: getFrontendUrl(),
                });
                await sendMail({ to: newUser.email, ...tpl, type: 'welcome' });
            } catch (e) {
                console.error('welcome mail dispatch:', e.message);
            }
        })();

        res.status(201).json({
            status: 'success',
            message: 'Kayıt işlemi başarılı!',
            token,
            data: {
                user: {
                    id: newUser.id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    role: newUser.role,
                    marketingConsent: newUser.marketingConsent,
                    emailConsentOffers: newUser.emailConsentOffers,
                    emailConsentNewsletter: newUser.emailConsentNewsletter,
                },
            },
        });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                status: 'fail',
                message: 'Bu e-posta adresi ile kayıtlı bir hesap zaten var.',
            });
        }
        if (err instanceof Sequelize.ValidationError || err.name === 'SequelizeValidationError') {
            const parts = (err.errors || [])
                .map((e) => (e && e.message ? e.message : ''))
                .filter(Boolean);
            const detail =
                parts.length > 0
                    ? parts.join(' ')
                    : err.message && err.message !== 'Validation error'
                      ? err.message
                      : 'Kayıt doğrulanamadı.';
            return res.status(400).json({ status: 'fail', message: detail });
        }
        res.status(400).json({ status: 'fail', message: err.message || 'Kayıt sırasında hata oluştu.' });
    }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'Lütfen e-posta ve şifrenizi giriniz.' });
        }

        const emailLogin = String(email || '').trim().toLowerCase();
        const user = await User.findOne({ where: { email: emailLogin } });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ status: 'fail', message: 'Hatalı e-posta veya şifre!' });
        }

        const token = signToken(user.id, user.role);

        res.status(200).json({
            status: 'success',
            message: 'Başarıyla giriş yapıldı.',
            token,
            data: {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    marketingConsent: user.marketingConsent,
                    emailConsentOffers: user.emailConsentOffers ?? user.marketingConsent,
                    emailConsentNewsletter: user.emailConsentNewsletter ?? user.marketingConsent,
                },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
// Güvenlik: kullanıcı varsa da yoksa da aynı yanıt döner (email enumeration koruma).
exports.forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ status: 'fail', message: 'E-posta adresi girin.' });
        }

        const user = await User.findOne({ where: { email } });

        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 dk
            await user.update({
                resetPasswordToken: token,
                resetPasswordExpiresAt: expires,
            });

            (async () => {
                try {
                    const meta = await getMailMeta();
                    const resetUrl = `${getFrontendUrl()}/sifre-sifirla/${token}`;
                    const tpl = passwordResetTemplate({
                        fullName: user.fullName,
                        resetUrl,
                        storeName: meta.storeName,
                        logoUrl: meta.logoUrl,
                    });
                    await sendMail({ to: user.email, ...tpl, type: 'passwordReset' });
                } catch (e) {
                    console.error('password reset mail dispatch:', e.message);
                }
            })();
        }

        // İster kullanıcı bulunmuş ister bulunmamış olsun, aynı yanıt.
        res.status(200).json({
            status: 'success',
            message:
                'Eğer bu e-posta sistemde kayıtlıysa, şifre sıfırlama bağlantısını kısa süre içinde gönderdik.',
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── GET ME ─────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    marketingConsent: user.marketingConsent,
                    marketingConsentAt: user.marketingConsentAt,
                    emailConsentOffers: user.emailConsentOffers ?? user.marketingConsent,
                    emailConsentNewsletter: user.emailConsentNewsletter ?? user.marketingConsent,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── UPDATE ME ──────────────────────────────────────────────────────────────
exports.updateMe = async (req, res) => {
    try {
        const user = req.user;
        const {
            fullName,
            marketingConsent,
            emailConsentOffers,
            emailConsentNewsletter,
            currentPassword,
            newPassword,
        } = req.body;

        const resolveOffers = (u) =>
            u.emailConsentOffers != null ? !!u.emailConsentOffers : !!u.marketingConsent;
        const resolveNews = (u) =>
            u.emailConsentNewsletter != null ? !!u.emailConsentNewsletter : !!u.marketingConsent;

        const prevOffers = resolveOffers(user);
        const prevNews = resolveNews(user);

        let nextOffers = prevOffers;
        let nextNews = prevNews;

        if (typeof emailConsentOffers === 'boolean') {
            nextOffers = emailConsentOffers;
        }
        if (typeof emailConsentNewsletter === 'boolean') {
            nextNews = emailConsentNewsletter;
        }
        if (
            typeof marketingConsent === 'boolean' &&
            typeof emailConsentOffers !== 'boolean' &&
            typeof emailConsentNewsletter !== 'boolean'
        ) {
            nextOffers = marketingConsent;
            nextNews = marketingConsent;
        }

        const prefsTouched =
            typeof emailConsentOffers === 'boolean' ||
            typeof emailConsentNewsletter === 'boolean' ||
            (typeof marketingConsent === 'boolean' &&
                typeof emailConsentOffers !== 'boolean' &&
                typeof emailConsentNewsletter !== 'boolean');

        const patch = {};

        if (typeof fullName === 'string' && fullName.trim()) {
            patch.fullName = fullName.trim().slice(0, 100);
        }

        if (prefsTouched) {
            patch.emailConsentOffers = nextOffers;
            patch.emailConsentNewsletter = nextNews;
            const anyM = nextOffers || nextNews;
            patch.marketingConsent = anyM;
            patch.marketingConsentAt = anyM ? user.marketingConsentAt || new Date() : null;
        }

        // Şifre değiştirme bloğu (her ikisi de verilmeliyse)
        if (currentPassword || newPassword) {
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Şifre değişikliği için mevcut şifre ve yeni şifre birlikte verilmelidir.',
                });
            }
            if (String(newPassword).length < 6) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Yeni şifre en az 6 karakter olmalıdır.',
                });
            }
            const ok = await user.comparePassword(currentPassword);
            if (!ok) {
                return res.status(400).json({ status: 'fail', message: 'Mevcut şifre yanlış.' });
            }
            const salt = await bcrypt.genSalt(10);
            patch.password = await bcrypt.hash(newPassword, salt);
        }

        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ status: 'fail', message: 'Güncellenecek alan yok.' });
        }

        await user.update(patch);
        await user.reload();

        if (prefsTouched) {
            try {
                const pins = await getMergedVersionPins();
                await ConsentEvent.create({
                    userId: user.id,
                    visitorKey: null,
                    channel: 'account_settings',
                    privacyVersion: pins.privacyVersion,
                    kvkkVersion: pins.kvkkVersion,
                    cookiePolicyVersion: pins.cookiePolicyVersion,
                    termsOfUseVersion: pins.termsOfUseVersion,
                    marketingAccepted: nextOffers || nextNews,
                    cookiePreferences: {
                        prev: { offers: prevOffers, newsletter: prevNews },
                        offers: !!user.emailConsentOffers,
                        newsletter: !!user.emailConsentNewsletter,
                    },
                    collectionMethod: 'preference_center_email_split',
                    userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
                    ipHash: hashIp(req.ip || req.socket?.remoteAddress),
                });
            } catch (ce) {
                console.error('consent event (profile):', ce.message);
            }
        }

        res.status(200).json({
            status: 'success',
            message: 'Profilin güncellendi.',
            data: {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    marketingConsent: user.marketingConsent,
                    marketingConsentAt: user.marketingConsentAt,
                    emailConsentOffers: !!user.emailConsentOffers,
                    emailConsentNewsletter: !!user.emailConsentNewsletter,
                },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── RESET PASSWORD ──────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'Geçersiz istek: token ve yeni şifre gerekli.' });
        }
        if (String(newPassword).length < 6) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'Şifre en az 6 karakter olmalıdır.' });
        }

        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpiresAt: { [Op.gt]: new Date() },
            },
        });

        if (!user) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'Bu bağlantı geçersiz veya süresi dolmuş.' });
        }

        // Şifreyi elle hashleyip update et — beforeCreate sadece create'te tetiklenir
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await user.update({
            password: hashed,
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        });

        res.status(200).json({
            status: 'success',
            message: 'Şifren başarıyla güncellendi. Yeni şifrenle giriş yapabilirsin.',
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
