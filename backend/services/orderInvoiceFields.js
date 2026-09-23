/** Sipariş öncesi: e-fatura / kurumsal fatura bilgisi doğrulama ve saklama alanları */

const BIREYSEL_TCKN_PLACEHOLDER = '11111111111';

function normalizeElectronicInvoiceFromBody(body) {
    const wants = Boolean(body?.wantsElectronicInvoice);
    const fullName = String(body?.fullName ?? '').trim() || 'Müşteri';

    if (!wants) {
        return {
            wantsElectronicInvoice: false,
            invoiceTaxNumber: BIREYSEL_TCKN_PLACEHOLDER,
            invoiceCompanyTitle: fullName.slice(0, 254),
            invoiceTaxOffice: null,
            eInvoiceStatus: 'none',
        };
    }

    const taxDigits = String(body?.invoiceTaxNumber ?? '')
        .replace(/\D/g, '')
        .trim();
    const title = String(body?.invoiceCompanyTitle ?? '').trim();
    const taxOffice = String(body?.invoiceTaxOffice ?? '').trim();

    if (taxDigits.length !== 10 && taxDigits.length !== 11) {
        throw new Error('Kurumsal fatura için geçerli VKN (10 hane) veya TCKN (11 hane) girilmelidir.');
    }
    if (!title || title.length < 2) {
        throw new Error('Fatura ünvanı / ad soyad eksik.');
    }
    if (taxDigits.length === 10 && !taxOffice) {
        throw new Error('Kurumsal fatura (VKN) için vergi dairesi zorunludur.');
    }

    return {
        wantsElectronicInvoice: true,
        invoiceTaxNumber: taxDigits,
        invoiceCompanyTitle: title.slice(0, 254),
        invoiceTaxOffice: taxOffice ? taxOffice.slice(0, 160) : null,
        eInvoiceStatus: 'none',
    };
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ province: string; district: string }} shipping
 */
function normalizeBillingAddressFromBody(body, shipping) {
    const sameRaw = body?.billingSameAsShipping;
    const billingSameAsShipping =
        sameRaw === undefined ||
        sameRaw === null ||
        sameRaw === true ||
        sameRaw === 'true' ||
        String(sameRaw).toLowerCase() === 'true';

    const shippingProvince = String(shipping?.province || '').trim();
    const shippingDistrict = String(shipping?.district || '').trim();

    if (billingSameAsShipping) {
        return {
            billingSameAsShipping: true,
            billingAddress: null,
            billingProvince: null,
            billingDistrict: null,
            shippingProvince: shippingProvince || null,
            shippingDistrict: shippingDistrict || null,
        };
    }

    const billingAddress = String(body?.billingAddress || '').trim();
    const billingProvince = String(body?.billingProvince || '').trim();
    const billingDistrict = String(body?.billingDistrict || '').trim();

    if (!billingAddress || billingAddress.length < 5) {
        throw new Error('Fatura açık adresini girin.');
    }
    if (!billingProvince) {
        throw new Error('Fatura adresi için il seçin.');
    }
    if (!billingDistrict) {
        throw new Error('Fatura adresi için ilçe seçin.');
    }

    return {
        billingSameAsShipping: false,
        billingAddress: billingAddress.slice(0, 4000),
        billingProvince: billingProvince.slice(0, 80),
        billingDistrict: billingDistrict.slice(0, 80),
        shippingProvince: shippingProvince || null,
        shippingDistrict: shippingDistrict || null,
    };
}

module.exports = {
    normalizeElectronicInvoiceFromBody,
    normalizeBillingAddressFromBody,
    BIREYSEL_TCKN_PLACEHOLDER,
};
