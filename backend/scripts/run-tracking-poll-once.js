/**
 * MNG/DHL eCommerce TR kargo takip cron'unu manuel olarak bir kere çalıştırır.
 * Sunucuda restart beklemeden test etmek için kullanılır.
 *
 * Kullanım:
 *   cd /www/wwwroot/astaticaret.com/backend
 *   node scripts/run-tracking-poll-once.js                  ← Tüm "kargolandi" siparişler için tick
 *   node scripts/run-tracking-poll-once.js 614118757013     ← Belirli takip no için tek sorgu
 *   node scripts/run-tracking-poll-once.js token            ← Sadece JWT mint testi (auth doğru mu)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { tick } = require('../services/tracking/trackingPoller');
const {
    queryMngTracking,
    getMngConfig,
    resetTokenCache,
} = require('../services/tracking/mngTrackingClient');
const sequelize = require('../config/database');

function mask(s) {
    if (!s) return '(boş)';
    if (s.length <= 8) return '…';
    return `${s.slice(0, 6)}…${s.slice(-2)}`;
}

(async () => {
    const cfg = getMngConfig();
    console.log('— MNG / DHL eCommerce TR konfigürasyonu —');
    console.log('  base host       :', cfg.base);
    console.log('  X-IBM-Client-Id :', mask(cfg.clientId));
    console.log('  X-IBM-Secret    :', mask(cfg.clientSecret));
    console.log('  customerNumber  :', mask(cfg.customerNumber));
    console.log('  password        :', mask(cfg.password));
    console.log('  identityType    :', cfg.identityType);
    console.log('  enabled         :', cfg.enabled);
    console.log('');

    if (!cfg.enabled) {
        console.error(
            'HATA: MNG_CLIENT_ID / MNG_CLIENT_SECRET / MNG_CUSTOMER_NUMBER / MNG_PASSWORD .env dosyasında boş.',
        );
        process.exit(1);
    }

    const arg = process.argv[2];

    try {
        if (arg === 'token') {
            console.log('→ Identity 1.0.1: JWT mint testi (sahte takip no ile bağlantı kontrolü)…');
            resetTokenCache();
            const res = await queryMngTracking('___ping___');
            console.log('  yanıt :', res);
            console.log(
                '  Yorum: error="mng_not_found" → token alındı, sadece numara yok (auth OK). ' +
                    'error="mng_auth_failed" → kimlik bilgileri hatalı.',
            );
        } else if (arg) {
            console.log(`→ Belirtilen takip no için MNG sorgusu: ${arg}`);
            const res = await queryMngTracking(arg);
            console.log('  yanıt :', res);
        } else {
            console.log('→ Tüm "kargolandi" durumdaki siparişler için tick() çalıştırılıyor…');
            await tick();
            console.log('  tick() tamam.');
        }
    } catch (err) {
        console.error('HATA:', err);
    }

    try {
        await sequelize.close();
    } catch {
        /* yok say */
    }
    process.exit(0);
})().catch((err) => {
    console.error('HATA:', err);
    process.exit(1);
});
