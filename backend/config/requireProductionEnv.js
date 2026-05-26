/**
 * NODE_ENV=production için zorunlu ortam doğrulaması (sunucu açılışında çağrılır).
 * Kritik sır eksikliğinde process çıkışı yapar.
 */
function originsList() {
    const raw = process.env.FRONTEND_ORIGINS || '';
    if (!raw.trim()) {
        return ['http://localhost:3000', 'http://localhost:3001'];
    }
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function isLikelyLoopbackOrigin(url) {
    return /^https?:\/\/((localhost)|(127\.0\.0\.1))(?::\d+)?(\/|$)/i.test(String(url || '').trim());
}

module.exports = function requireProductionEnv() {
    if (process.env.NODE_ENV !== 'production') return;

    const jwt = process.env.JWT_SECRET;
    if (!jwt || jwt.length < 32) {
        console.error(
            '[FATAL] Production ortamında JWT_SECRET tanımlı olmalı ve en az 32 karakter güçlü bir değer içermelidir.',
        );
        process.exit(1);
    }

    const fpu = (process.env.FRONTEND_PUBLIC_URL || '').trim();
    if (!fpu) {
        console.warn(
            '[UYARI] FRONTEND_PUBLIC_URL boş — e-posta ve sistem linkleri varsayılan localhost adresine düşebilir.',
        );
    } else if (isLikelyLoopbackOrigin(fpu)) {
        console.warn('[UYARI] FRONTEND_PUBLIC_URL hâlâ localhost/127.* — kullanıcı e-postasındaki linkler yanlış olur.');
    }

    const oList = originsList();
    const corsOnlyLoopback = oList.length > 0 && oList.every(isLikelyLoopbackOrigin);
    if (corsOnlyLoopback) {
        console.warn(
            '[UYARI] FRONTEND_ORIGINS yalnızca localhost gibi adresler içeriyor — canlı alan adlarını ekleyin (CORS).',
        );
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_HOST.trim()) {
        console.warn(
            '[UYARI] SMTP_HOST tanımlı değil — nodemailer Ethereal/eşdeğeri test kutusunu kullanırsa gerçek e-posta gitmez.',
        );
    }

    const mid = !!(process.env.PAYTR_MERCHANT_ID || '').trim();
    const mkey = !!(process.env.PAYTR_MERCHANT_KEY || '').trim();
    const msalt = !!(process.env.PAYTR_MERCHANT_SALT || '').trim();
    if (!mid || !mkey || !msalt) {
        console.warn(
            '[UYARI] PAYTR_MERCHANT_ID / PAYTR_MERCHANT_KEY / PAYTR_MERCHANT_SALT eksik — PayTR ödeme başlatılamaz.',
        );
    }
};
