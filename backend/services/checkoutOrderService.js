const Order = require('../models/Order');
const Product = require('../models/Product');
const { normalizeCouponCode, validateCheckoutCustomer } = require('./checkoutCustomerValidate');
const { resolveCartLine } = require('../utils/productVariants');
const { computeExpectedTotal, totalsMatchClient } = require('./orderPricing');
const { allocateFromWarehouses, applyReservation, syncProductStockField } = require('./inventoryService');
const { normalizeElectronicInvoiceFromBody } = require('./orderInvoiceFields');
const { ORDER_CHECKOUT_PENDING_INSERT_FIELDS } = require('../constants/orderInsertFields');
const { getMergedVersionPins } = require('./legalPagesMerge');

/**
 * Sepet → stok rezervasyonu + `odeme_bekleniyor` sipariş kaydı (transaction içinde).
 * @param {import('express').Request} req
 * @param {import('sequelize').Transaction} t
 */
async function createPendingOrderInTransaction(req, t) {
    const {
        items,
        totalAmount,
        fullName,
        email,
        phone,
        address,
        couponCode,
        province,
        district,
        acceptedCheckoutLegal,
        preInfoSalesVersion,
        distanceSalesVersion,
    } = req.body;

    const invoiceFields = normalizeElectronicInvoiceFromBody(req.body);

    const emailNorm = String(email || '')
        .trim()
        .toLowerCase();
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        throw new Error('Geçerli e-posta adresi gerekli.');
    }

    validateCheckoutCustomer({ fullName, phone });

    const acceptedLegal =
        acceptedCheckoutLegal === true ||
        acceptedCheckoutLegal === 'true' ||
        String(acceptedCheckoutLegal).toLowerCase() === 'true';
    if (!acceptedLegal) {
        throw new Error('Ödeme öncesi Ön Bilgilendirme ve Mesafeli Satış metinlerini onaylamanız gerekir.');
    }

    const preV = String(preInfoSalesVersion || '').trim();
    const distV = String(distanceSalesVersion || '').trim();
    const pins = await getMergedVersionPins();
    if (preV !== pins.preInfoSalesVersion || distV !== pins.distanceSalesVersion) {
        throw new Error(
            'Yasal metin sürümleri güncellendi. Sayfayı yenileyip sipariş özetini tekrar onaylayın.',
        );
    }

    const couponNorm = normalizeCouponCode(couponCode);

    const provinceName = String(province || '').trim();
    if (!provinceName || !String(district || '').trim()) {
        throw new Error('İl ve ilçe bilgisi gerekli.');
    }

    if (!items || items.length === 0) {
        throw new Error('Sepetiniz boş.');
    }

    const enrichedItems = [];

    for (const line of items) {
        const product = await Product.findByPk(line.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!product || !product.is_active) {
            throw new Error('Sepetteki bir ürün artık satılamıyor veya bulunamadı.');
        }

        const qty = Math.floor(Number(line.quantity) || 0);
        if (qty < 1) throw new Error('Geçersiz ürün adedi.');

        const vid = line.variantId != null && line.variantId !== '' ? line.variantId : null;
        let resolved;
        try {
            resolved = resolveCartLine(product, vid, qty);
        } catch (variantErr) {
            variantErr.message = variantErr.message || 'Sepet doğrulanamadı.';
            throw variantErr;
        }

        const allocations = await allocateFromWarehouses(product.id, qty, t);
        await applyReservation(allocations, product.id, t);
        await syncProductStockField(product.id, t);

        const price = resolved.unitPrice;
        enrichedItems.push({
            id: product.id,
            name: resolved.displayName,
            price,
            quantity: qty,
            images: product.images,
            area: product.area,
            purpose: product.purpose,
            warehouseAllocations: allocations,
            variantId: resolved.variantId,
            variantName: resolved.variantName,
        });
    }

    const pricing = await computeExpectedTotal({ items: enrichedItems, couponCode: couponNorm });
    if (!totalsMatchClient(pricing.total, totalAmount)) {
        throw new Error('Sipariş tutarı doğrulanamadı. Sepetinizi yenileyip tekrar deneyin.');
    }

    let linkUserId = null;
    if (req.user) {
        const accountEmail = String(req.user.email || '').trim().toLowerCase();
        if (accountEmail === emailNorm) {
            linkUserId = req.user.id;
        }
    }

    const order = await Order.create(
        {
            fullName: String(fullName || '').trim(),
            email: emailNorm,
            phone: String(phone || '').replace(/\D/g, ''),
            address,
            userId: linkUserId,
            items: enrichedItems,
            totalAmount: Number(pricing.total).toFixed(2),
            couponCode: couponNorm,
            status: 'odeme_bekleniyor',
            wantsElectronicInvoice: invoiceFields.wantsElectronicInvoice,
            invoiceTaxNumber: invoiceFields.invoiceTaxNumber,
            invoiceCompanyTitle: invoiceFields.invoiceCompanyTitle,
            invoiceTaxOffice: invoiceFields.invoiceTaxOffice,
            eInvoiceStatus: invoiceFields.eInvoiceStatus,
        },
        { transaction: t, fields: [...ORDER_CHECKOUT_PENDING_INSERT_FIELDS] },
    );

    return order;
}

module.exports = { createPendingOrderInTransaction };
