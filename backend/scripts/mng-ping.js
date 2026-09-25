/**
 * Sunucuda MNG API erişimini ve token almayı dener (sandbox veya canlı).
 *   cd backend && node scripts/mng-ping.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
    isMngKargoEnabled,
    getMngKargoConfig,
    isMngProductionApi,
    getMngApiEnv,
} = require('../services/mngKargo/mngKargoConfig');
const { getMngJwt, clearMngTokenCache } = require('../services/mngKargo/mngKargoHttp');

async function main() {
    const cfg = getMngKargoConfig();
    console.log('MNG_API_BASE_URL:', cfg.baseUrl);
    console.log('MNG_API_ENV:', getMngApiEnv());
    console.log('Ortam:', isMngProductionApi() ? 'CANLI (production)' : 'sandbox (testapi)');
    if (isMngProductionApi()) {
        console.warn('Uyarı: Canlı API — admin "DHL ile kargoya ver" gerçek gönderi oluşturur.');
    }
    console.log('MNG yapılandırılmış:', isMngKargoEnabled());
    if (!isMngKargoEnabled()) {
        console.error('Eksik: MNG_IBM_CLIENT_ID, MNG_IBM_CLIENT_SECRET, MNG_CUSTOMER_NUMBER, MNG_CUSTOMER_PASSWORD');
        process.exit(1);
    }
    clearMngTokenCache();
    try {
        const jwt = await getMngJwt();
        console.log('Token OK, uzunluk:', jwt.length);
    } catch (e) {
        console.error('Token HATA:', e.message);
        process.exit(1);
    }
}

main();
