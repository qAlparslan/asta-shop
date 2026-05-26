/**
 * Ödeme bekleyen sipariş INSERT—yalnızca bu kolonlar yazılır.
 */
const ORDER_CHECKOUT_PENDING_INSERT_FIELDS = Object.freeze([
    'fullName',
    'email',
    'userId',
    'phone',
    'address',
    'items',
    'totalAmount',
    'couponCode',
    'status',
    'wantsElectronicInvoice',
    'invoiceTaxNumber',
    'invoiceCompanyTitle',
    'invoiceTaxOffice',
    'eInvoiceStatus',
]);

module.exports = { ORDER_CHECKOUT_PENDING_INSERT_FIELDS };
