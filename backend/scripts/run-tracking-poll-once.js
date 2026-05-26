/**
 * DHL kargo takip cron'unu manuel olarak bir kere çalıştırır.
 * Sunucuda restart beklemeden test etmek için kullanılır.
 *
 * Kullanım:
 *   cd /www/wwwroot/astaticaret.com/backend
 *   node scripts/run-tracking-poll-once.js
 *   node scripts/run-tracking-poll-once.js 1234567890   ← Belirli takip no için sorgu
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { tick } = require('../services/tracking/trackingPoller');
const { queryDhlTracking, getDhlConfig } = require('../services/tracking/dhlTrackingClient');
const sequelize = require('../config/database');

(async () => {
    const cfg = getDhlConfig();
    console.log('— DHL konfigürasyonu —');
    console.log('  base    :', cfg.base);
    console.log('  enabled :', cfg.enabled);
    console.log('  username:', cfg.username ? `${cfg.username.slice(0, 6)}…` : '(boş)');
    console.log('  password:', cfg.password ? `${cfg.password.slice(0, 6)}…` : '(boş)');
    console.log('');

    if (!cfg.enabled) {
        console.error('HATA: DHL_API_USERNAME / DHL_API_PASSWORD .env dosyasında boş.');
        process.exit(1);
    }

    const trackingArg = process.argv[2];

    if (trackingArg) {
        console.log(`→ Belirtilen takip no için DHL sorgusu: ${trackingArg}`);
        const res = await queryDhlTracking(trackingArg);
        console.log('  yanıt :', res);
    } else {
        console.log('→ Tüm "kargolandi" durumdaki siparişler için tick() çalıştırılıyor…');
        await tick();
        console.log('  tick() tamam.');
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
