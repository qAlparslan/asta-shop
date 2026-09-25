/** @returns {boolean} */
function isMngKargoEnabled() {
    if (String(process.env.MNG_KARGO_ENABLED || '').toLowerCase() === 'false') return false;
    return Boolean(
        process.env.MNG_IBM_CLIENT_ID &&
            process.env.MNG_IBM_CLIENT_SECRET &&
            process.env.MNG_CUSTOMER_NUMBER &&
            process.env.MNG_CUSTOMER_PASSWORD,
    );
}

/** @returns {boolean} api.mngkargo.com.tr (canlı) — testapi değil */
function isMngProductionApi() {
    const baseUrl = (process.env.MNG_API_BASE_URL || 'https://testapi.mngkargo.com.tr').replace(/\/$/, '');
    return !/testapi\.mngkargo\.com\.tr/i.test(baseUrl);
}

function getMngKargoConfig() {
    const baseUrl = (process.env.MNG_API_BASE_URL || 'https://testapi.mngkargo.com.tr').replace(/\/$/, '');
    return {
        baseUrl,
        clientId: process.env.MNG_IBM_CLIENT_ID || '',
        clientSecret: process.env.MNG_IBM_CLIENT_SECRET || '',
        customerNumber: process.env.MNG_CUSTOMER_NUMBER || '',
        customerPassword: process.env.MNG_CUSTOMER_PASSWORD || '',
        defaultDesi: Math.max(1, Number(process.env.MNG_DEFAULT_DESI) || 1),
        defaultKg: Math.max(1, Number(process.env.MNG_DEFAULT_KG) || 1),
        packagingType: Number(process.env.MNG_PACKAGING_TYPE) || 3,
        shipmentServiceType: Number(process.env.MNG_SHIPMENT_SERVICE_TYPE) || 1,
        paymentType: Number(process.env.MNG_PAYMENT_TYPE) || 1,
        deliveryType: Number(process.env.MNG_DELIVERY_TYPE) || 1,
    };
}

module.exports = { isMngKargoEnabled, getMngKargoConfig, isMngProductionApi };
