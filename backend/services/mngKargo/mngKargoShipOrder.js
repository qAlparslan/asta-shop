const { getMngKargoConfig } = require('./mngKargoConfig');
const { mngApiRequest } = require('./mngKargoHttp');
const { resolveCityDistrictCodes } = require('./mngGeoCodes');
const { buildMngReferenceId, pieceBarcode } = require('./mngOrderReference');

function normalizePhone(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('90') && d.length === 12) d = d.slice(2);
    if (d.startsWith('0') && d.length === 11) d = d.slice(1);
    return d.slice(0, 10);
}

/**
 * @param {import('../../models/Order').default} order
 */
async function buildCreateOrderBody(order) {
    const cfg = getMngKargoConfig();
    const referenceId = buildMngReferenceId(order);
    const { cityCode, districtCode } = await resolveCityDistrictCodes(
        order.shippingProvince,
        order.shippingDistrict,
    );
    const mobile = normalizePhone(order.phone);
    if (mobile.length < 10) {
        throw new Error('MNG: Geçerli alıcı telefon numarası gerekli (10 hane).');
    }

    const pieceBarcodeVal = pieceBarcode(referenceId, 1);
    const content = 'E-ticaret siparişi';

    return {
        order: {
            referenceId,
            barcode: referenceId,
            billOfLandingId: referenceId,
            isCOD: 0,
            codAmount: 0,
            shipmentServiceType: cfg.shipmentServiceType,
            packagingType: cfg.packagingType,
            content,
            smsPreference1: 1,
            smsPreference2: 0,
            smsPreference3: 1,
            paymentType: cfg.paymentType,
            deliveryType: cfg.deliveryType,
            description: content,
            marketPlaceShortCode: '',
            marketPlaceSaleCode: '',
        },
        orderPieceList: [
            {
                barcode: pieceBarcodeVal,
                desi: cfg.defaultDesi,
                kg: cfg.defaultKg,
                content,
            },
        ],
        recipient: {
            customerId: 0,
            refCustomerId: '',
            cityCode,
            districtCode,
            address: String(order.address || '').trim().slice(0, 500),
            bussinessPhoneNumber: '',
            email: String(order.email || '').trim().slice(0, 120),
            taxOffice: '',
            taxNumber: '',
            fullName: String(order.fullName || '').trim().slice(0, 120),
            homePhoneNumber: '',
            mobilePhoneNumber: mobile,
        },
    };
}

/**
 * @param {string} referenceId
 */
async function createBarcodeForReference(referenceId) {
    const cfg = getMngKargoConfig();
    const pieceBarcodeVal = pieceBarcode(referenceId, 1);
    return mngApiRequest({
        method: 'POST',
        path: '/mngapi/api/barcodecmdapi/createbarcode',
        body: {
            referenceId,
            billOfLandingId: referenceId,
            isCOD: 0,
            codAmount: 0,
            packagingType: cfg.packagingType,
            printReferenceBarcodeOnError: 1,
            orderPieceList: [
                {
                    barcode: pieceBarcodeVal,
                    desi: cfg.defaultDesi,
                    kg: cfg.defaultKg,
                    content: 'E-ticaret siparişi',
                },
            ],
        },
    });
}

/**
 * @param {import('../../models/Order').default} order
 * @returns {Promise<{
 *   referenceId: string;
 *   shipmentId: string;
 *   trackingNumber: string;
 *   labelPayload: string | null;
 *   barcodes: { pieceNumber?: number; value?: string }[];
 * }>}
 */
async function createMngShipmentForOrder(order) {
    const referenceId = buildMngReferenceId(order);

    if (!order.mngReferenceId) {
        try {
            const body = await buildCreateOrderBody(order);
            await mngApiRequest({
                method: 'POST',
                path: '/mngapi/api/standardcmdapi/createOrder',
                body,
            });
        } catch (e) {
            const msg = String(e.message || '');
            if (!/exist|duplicate|zaten|already/i.test(msg)) throw e;
        }
    }

    const barcodeRes = await createBarcodeForReference(referenceId);
    const shipmentId = String(barcodeRes?.shipmentId || '').trim();
    const barcodes = Array.isArray(barcodeRes?.barcodes) ? barcodeRes.barcodes : [];
    const firstBarcode = String(barcodes[0]?.value || '').trim();
    const trackingNumber = shipmentId || firstBarcode;
    if (!trackingNumber) {
        throw new Error('MNG createbarcode sonrası takip numarası alınamadı.');
    }

    const labelPayload = firstBarcode && firstBarcode.length > 50 ? firstBarcode : null;

    return {
        referenceId,
        shipmentId,
        trackingNumber,
        labelPayload,
        barcodes,
    };
}

/**
 * @param {string} referenceId
 */
async function trackMngByReference(referenceId) {
    return mngApiRequest({
        method: 'GET',
        path: `/mngapi/api/standardqueryapi/trackshipment/${encodeURIComponent(referenceId)}`,
    });
}

module.exports = {
    createMngShipmentForOrder,
    trackMngByReference,
    buildMngReferenceId,
};
