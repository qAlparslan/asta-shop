/** PayTR merchant_oid ↔ sipariş UUID (tire yok, 32 hex). */

function uuidToMerchantOid(uuid) {
    return String(uuid || '').replace(/-/g, '');
}

function merchantOidToOrderId(merchantOid) {
    const s = String(merchantOid || '').trim();
    if (/^[0-9a-f]{32}$/i.test(s)) {
        return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
    }
    return s;
}

module.exports = { uuidToMerchantOid, merchantOidToOrderId };
