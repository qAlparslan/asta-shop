const { rateLimit } = require('express-rate-limit');



const jsonMessage = (msg) => ({ status: 'fail', message: msg });



function clientIp(req) {

    return req.ip || req.socket?.remoteAddress || 'unknown';

}



/**

 * Başarısız girişleri sayar — başarılı giriş (2xx) limiti düşürmez.

 * IP başına brute force freni.

 */

const loginIpLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_LOGIN_PER_IP_MAX || '40', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    skipSuccessfulRequests: true,

    keyGenerator: (req) => `login-ip:${clientIp(req)}`,

    message: jsonMessage('Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'),

});



/**

 * Aynı e-posta için (credential stuffing dağıtık saldırılar dahil)

 * kimlik bazlı sıkılık — e-posta yoksa IP anahtarına düşer.

 */

const loginIdentityLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_LOGIN_PER_EMAIL_MAX || '12', 10),

    standardHeaders: false,

    legacyHeaders: false,

    skipSuccessfulRequests: true,

    keyGenerator: (req) => {

        const em = String(req.body?.email || '').toLowerCase().trim().slice(0, 254);

        if (em) return `login-acc:${em}`;

        return `login-fallback-ip:${clientIp(req)}`;

    },

    message: jsonMessage('Bu hesap için çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.'),

});



/** Kayıt — hesap spam / otomasyon */

const registerLimiter = rateLimit({

    windowMs: 60 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '10', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => `reg:${clientIp(req)}`,

    message: jsonMessage('Bu IP adresinden çok fazla kayıt isteği. Lütfen daha sonra tekrar deneyin.'),

});



/** Şifre sıfırlama isteği (her istek genelde 200 döner — e-posta sızdırmayı önlemek için) */

const forgotPasswordLimiter = rateLimit({

    windowMs: 60 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX || '8', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => `forgot:${clientIp(req)}`,

    message: jsonMessage('Çok fazla şifre sıfırlama isteği. Lütfen daha sonra tekrar deneyin.'),

});



/** Yeni şifre belirleme (token ile) */

const resetPasswordLimiter = rateLimit({

    windowMs: 60 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_RESET_PASSWORD_MAX || '20', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => `reset:${clientIp(req)}`,

    message: jsonMessage('Çok fazla deneme. Lütfen daha sonra tekrar deneyin.'),

});



/**

 * Kampanya / toplu mail mutasyonları — admin kullanıcı + IP bileşeni

 */

const campaignMutationLimiter = rateLimit({

    windowMs: 60 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_CAMPAIGN_MAX || '40', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => {

        const uid = req.user?.id ? String(req.user.id) : 'anon';

        return `camp:${uid}:${clientIp(req)}`;

    },

    message: jsonMessage('Kampanya işlem limiti aşıldı. Bir süre sonra tekrar deneyin.'),

});



/** Rıza kaydı (cookie banner vb.) */

const consentEventLimiter = rateLimit({

    windowMs: 60 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_CONSENT_EVENTS_MAX || '120', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => `consent:${clientIp(req)}`,

    message: jsonMessage('Çok fazla istek.'),

});



/** Footer bülten */

const newsletterSubscribeLimiter = rateLimit({

    windowMs: 60 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_NEWSLETTER_SUBSCRIBE_MAX || '40', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => `nl-sub:${clientIp(req)}`,

    message: jsonMessage('Çok fazla abonelik isteği. Lütfen daha sonra tekrar deneyin.'),

});



/** Ürün yorumu oluşturma (IP bazlı) */

const productReviewPostLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_PRODUCT_REVIEW_POST_MAX || '30', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => `product-review:${clientIp(req)}`,

    message: jsonMessage('Çok fazla yorum gönderimi. Lütfen bir süre sonra tekrar deneyin.'),

});



/** Stok bildirimi aboneliği */

const productStockAlertPostLimiter = rateLimit({

    windowMs: 60 * 60 * 1000,

    limit: parseInt(process.env.RATE_LIMIT_STOCK_ALERT_POST_MAX || '25', 10),

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    keyGenerator: (req) => `stock-alert:${clientIp(req)}`,

    message: jsonMessage('Çok fazla stok bildirimi isteği. Lütfen daha sonra tekrar deneyin.'),

});



module.exports = {

    loginIpLimiter,

    loginIdentityLimiter,

    registerLimiter,

    forgotPasswordLimiter,

    resetPasswordLimiter,

    campaignMutationLimiter,

    consentEventLimiter,

    newsletterSubscribeLimiter,

    productReviewPostLimiter,

    productStockAlertPostLimiter,

};


