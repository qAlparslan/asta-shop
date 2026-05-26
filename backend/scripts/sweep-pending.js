/* eslint-disable no-console */
/**
 * Tüm odeme_bekleniyor siparişlerini hemen iptal eder ve rezervasyonları iade eder.
 * Test sonrası takılı kalmış kayıtları temizlemek için.
 *
 * Çalıştırma (backend/ klasöründe):
 *   node scripts/sweep-pending.js
 *
 * NOT: Bu script PayTR ile konuşmaz; sipariş gerçekten ödenmişse bunu çalıştırmak
 * stoğu yanlış serbest bırakır. Önce "node scripts/order-fix.js list" ile bak,
 * gerçekten ödenmiş bir sipariş varsa onu "complete" et, kalanları sweep'le.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const sequelize = require('../config/database');
const Order = require('../models/Order');
const { releaseOrderInventory } = require('../services/orderInventory');

(async () => {
    const rows = await Order.findAll({ where: { status: 'odeme_bekleniyor' } });
    if (!rows.length) {
        console.log('odeme_bekleniyor durumunda sipariş yok — sweep gerekmedi.');
        await sequelize.close();
        return;
    }
    console.log(`${rows.length} sipariş iptal edilecek ve rezervasyon iade edilecek.`);

    for (const o of rows) {
        const tx = await sequelize.transaction();
        try {
            const fresh = await Order.findByPk(o.id, { transaction: tx, lock: tx.LOCK.UPDATE });
            if (!fresh || fresh.status !== 'odeme_bekleniyor') {
                await tx.commit();
                continue;
            }
            await releaseOrderInventory(fresh, tx);
            await fresh.update({ status: 'iptal-edildi' }, { transaction: tx });
            await tx.commit();
            console.log('🚫 iptal + rezervasyon iade:', fresh.id);
        } catch (e) {
            await tx.rollback();
            console.error('HATA:', o.id, e.message);
        }
    }

    await sequelize.close();
})();
