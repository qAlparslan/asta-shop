/* eslint-disable no-console */
/**
 * Tek bir siparişi elle düzeltir.
 *
 * Komutlar:
 *   node scripts/order-fix.js list                       → odeme_bekleniyor durumundaki siparişleri listele
 *   node scripts/order-fix.js show   <orderId>           → siparişi ayrıntılı göster
 *   node scripts/order-fix.js complete <orderId>         → stoğu kesin düş, status=hazirlaniyor
 *   node scripts/order-fix.js cancel   <orderId>         → rezervasyonu iade et, status=iptal-edildi
 *
 * Sadece status=odeme_bekleniyor olan siparişlerde işlem yapar; aksi halde uyarı verir.
 *
 * Kullanım örneği:
 *   cd backend
 *   node scripts/order-fix.js list
 *   node scripts/order-fix.js complete 1b9e01fa-adc6-4f28-a328-ffda0821095a
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const sequelize = require('../config/database');
const Order = require('../models/Order');
const {
    commitOrderInventory,
    releaseOrderInventory,
} = require('../services/orderInventory');

function printOrderRow(o) {
    const totals = `${o.totalAmount} TL`;
    console.log(
        `${o.id}  ${o.status.padEnd(18)}  ${totals.padEnd(12)}  ${o.fullName || ''}  ${o.email || ''}  (${o.createdAt?.toISOString?.() || o.createdAt})`,
    );
}

async function listPending() {
    const rows = await Order.findAll({
        where: { status: 'odeme_bekleniyor' },
        order: [['createdAt', 'DESC']],
        limit: 50,
    });
    if (!rows.length) {
        console.log('odeme_bekleniyor durumunda sipariş yok.');
        return;
    }
    console.log(`odeme_bekleniyor durumunda ${rows.length} sipariş:`);
    rows.forEach(printOrderRow);
}

async function show(orderId) {
    const o = await Order.findByPk(orderId);
    if (!o) {
        console.error('Sipariş bulunamadı:', orderId);
        process.exit(1);
    }
    console.log('id        :', o.id);
    console.log('status    :', o.status);
    console.log('total     :', o.totalAmount);
    console.log('email     :', o.email);
    console.log('createdAt :', o.createdAt);
    const items = typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []);
    console.log('items     :');
    items.forEach((it, i) => {
        const allocs = (it.warehouseAllocations || [])
            .map((a) => `${a.warehouseName}:${a.qty}`)
            .join(', ');
        console.log(
            `  ${i + 1}. ${it.name}  x${it.quantity}  birim ${it.price}  [${allocs}]`,
        );
    });
}

async function complete(orderId) {
    const tx = await sequelize.transaction();
    try {
        const o = await Order.findByPk(orderId, { transaction: tx, lock: tx.LOCK.UPDATE });
        if (!o) throw new Error('Sipariş bulunamadı.');
        if (o.status !== 'odeme_bekleniyor') {
            throw new Error(`Sipariş zaten "${o.status}" durumunda. İşlem yapılmadı.`);
        }
        await commitOrderInventory(o, tx);
        await o.update(
            {
                status: 'hazirlaniyor',
                eInvoiceStatus: o.wantsElectronicInvoice ? 'awaiting_integration' : 'none',
                eInvoiceLastError: null,
            },
            { transaction: tx },
        );
        await tx.commit();
        console.log('✅ Sipariş tamamlandı (hazirlaniyor), stok kesin düşüldü:', orderId);
    } catch (e) {
        await tx.rollback();
        console.error('HATA:', e.message);
        process.exit(1);
    }
}

async function cancel(orderId) {
    const tx = await sequelize.transaction();
    try {
        const o = await Order.findByPk(orderId, { transaction: tx, lock: tx.LOCK.UPDATE });
        if (!o) throw new Error('Sipariş bulunamadı.');
        if (o.status !== 'odeme_bekleniyor') {
            throw new Error(`Sipariş zaten "${o.status}" durumunda. İşlem yapılmadı.`);
        }
        await releaseOrderInventory(o, tx);
        await o.update({ status: 'iptal-edildi' }, { transaction: tx });
        await tx.commit();
        console.log('🚫 Sipariş iptal, rezervasyon iade edildi:', orderId);
    } catch (e) {
        await tx.rollback();
        console.error('HATA:', e.message);
        process.exit(1);
    }
}

(async () => {
    const [, , cmd, orderId] = process.argv;
    try {
        if (cmd === 'list') {
            await listPending();
        } else if (cmd === 'show' && orderId) {
            await show(orderId);
        } else if (cmd === 'complete' && orderId) {
            await complete(orderId);
        } else if (cmd === 'cancel' && orderId) {
            await cancel(orderId);
        } else {
            console.log('Kullanım:');
            console.log('  node scripts/order-fix.js list');
            console.log('  node scripts/order-fix.js show     <orderId>');
            console.log('  node scripts/order-fix.js complete <orderId>');
            console.log('  node scripts/order-fix.js cancel   <orderId>');
            process.exit(1);
        }
    } finally {
        await sequelize.close();
    }
})();
