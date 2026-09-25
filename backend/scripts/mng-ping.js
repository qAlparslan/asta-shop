/**
 * MNG / DHL eCommerce TR API erişim testi (sandbox veya canlı).
 *
 *   cd backend && npm run mng:ping
 *   cd backend && node scripts/mng-ping.js
 *   cd backend && node scripts/mng-ping.js --quick   (yalnızca token)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
    isMngKargoEnabled,
    getMngKargoConfig,
    isMngProductionApi,
    getMngApiEnv,
} = require('../services/mngKargo/mngKargoConfig');
const { getMngJwt, clearMngTokenCache, mngApiRequest } = require('../services/mngKargo/mngKargoHttp');

const quick = process.argv.includes('--quick');

async function main() {
    const cfg = getMngKargoConfig();
    console.log('--- MNG ping ---');
    console.log('Host:', cfg.baseUrl);
    console.log('MNG_API_ENV:', getMngApiEnv());
    console.log('Ortam:', isMngProductionApi() ? 'CANLI' : 'sandbox');
    if (isMngProductionApi()) {
        console.warn('(Canlı ortam — gönderi API çağrıları gerçek kargo oluşturur.)');
    }

    if (!isMngKargoEnabled()) {
        console.error('\nHATA: .env eksik.');
        console.error('Gerekli: MNG_IBM_CLIENT_ID, MNG_IBM_CLIENT_SECRET, MNG_CUSTOMER_NUMBER, MNG_CUSTOMER_PASSWORD');
        process.exit(1);
    }

    const mask = (s) => {
        const t = String(s || '');
        if (t.length <= 4) return '****';
        return `${t.slice(0, 2)}…${t.slice(-2)} (${t.length} karakter)`;
    };
    console.log('IBM Client Id:', mask(cfg.clientId));
    console.log('Müşteri no:', mask(cfg.customerNumber));

    clearMngTokenCache();

    try {
        const jwt = await getMngJwt();
        console.log('\n[1/2] Token: OK (JWT uzunluk:', jwt.length, ')');
    } catch (e) {
        console.error('\n[1/2] Token: HATA');
        console.error(e.message);
        console.error('[2/2] CBS Info: atlandı (önce geçerli token gerekir).');
        process.exit(1);
    }

    if (quick) {
        console.log('\nSonuç: MNG token alınabiliyor (--quick, CBS atlandı).');
        process.exit(0);
    }

    try {
        const cities = await mngApiRequest({
            method: 'GET',
            path: '/mngapi/api/cbsinfoapi/getcities',
        });
        const n = Array.isArray(cities) ? cities.length : 0;
        if (n === 0) {
            throw new Error('CBS getcities boş veya beklenmeyen yanıt');
        }
        console.log('[2/2] CBS Info (getcities): OK —', n, 'il');
    } catch (e) {
        console.error('\n[2/2] CBS Info: HATA (Identity çalışıyor olabilir; CBS Info aboneliğini kontrol edin)');
        console.error(e.message);
        process.exit(1);
    }

    console.log('\nSonuç: MNG bağlantısı çalışıyor (token + CBS).');
}

main();
