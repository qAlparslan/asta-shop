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

module.exports = { normalizeElectronicInvoiceFromBody, BIREYSEL_TCKN_PLACEHOLDER };
