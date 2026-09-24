const Order = require('../models/Order');

/** 10 veya 11 haneli benzersiz sipariş numarası */
function randomNumericOrderNumber() {
    const eleven = Math.random() < 0.5;
    if (eleven) {
        return String(Math.floor(10_000_000_000 + Math.random() * 90_000_000_000));
    }
    return String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000));
}

/**
 * @param {import('sequelize').Transaction | undefined} transaction
 * @returns {Promise<string>}
 */
async function allocateUniqueOrderNumber(transaction) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        const candidate = randomNumericOrderNumber();
        const existing = await Order.findOne({
            where: { orderNumber: candidate },
            attributes: ['id'],
            transaction,
        });
        if (!existing) return candidate;
    }
    throw new Error('Sipariş numarası üretilemedi; lütfen tekrar deneyin.');
}

/** Eski kayıtlar için deterministik 10 hane (UUID hash) — çakışmada rastgele */
function legacyOrderNumberFromUuid(uuid) {
    const hex = String(uuid || '').replace(/-/g, '');
    if (hex.length < 8) return randomNumericOrderNumber();
    const slice = hex.slice(0, 10);
    const asNum = parseInt(slice, 16);
    let n = String((asNum % 9_000_000_000) + 1_000_000_000);
    if (n.length > 10) n = n.slice(0, 10);
    while (n.length < 10) n = `${n}0`;
    return n;
}

module.exports = {
    allocateUniqueOrderNumber,
    legacyOrderNumberFromUuid,
    randomNumericOrderNumber,
};
