/* eslint-disable no-console */
/**
 * Ürünler ve kullanıcılar HARİÇ işlem / geçmiş verilerini sıfırlar.
 *
 * KALAN (dokunulmaz):
 *   users, products, categories, site_settings,
 *   warehouses, product_warehouse_stocks, home_hero_slides
 *
 * SİLİNEN:
 *   orders, coupons, campaigns, email_logs, newsletter_subscribers,
 *   contact_messages, consent_events, admin_audit_logs, product_reviews,
 *   product_stock_alerts, email_delivery_feedback, email_automations
 *
 * Ek: product_warehouse_stocks.reserved → 0 (sipariş rezervasyonu temizliği)
 *
 * Kullanım:
 *   cd backend
 *   node scripts/reset-transactional-data.js              # önizleme (dry-run)
 *   node scripts/reset-transactional-data.js --confirm YES   # gerçekten sil
 *
 * UYARI: Geri alınamaz. Önce yedek alın.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const sequelize = require('../config/database');

/** Silinecek tablolar (sıra: alt bağımlılıklar önce) */
const TABLES_TO_TRUNCATE = [
    'email_delivery_feedback',
    'email_logs',
    'admin_audit_logs',
    'consent_events',
    'contact_messages',
    'product_reviews',
    'product_stock_alerts',
    'newsletter_subscribers',
    'campaigns',
    'coupons',
    'orders',
    'email_automations',
];

/** Sadece sayım gösterilecek — silinmez */
const TABLES_KEPT = [
    'users',
    'products',
    'categories',
    'site_settings',
    'warehouses',
    'product_warehouse_stocks',
    'home_hero_slides',
];

async function tableExists(table) {
    const dbName = sequelize.config.database;
    const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        { replacements: [dbName, table] },
    );
    return Number(rows?.[0]?.c || 0) > 0;
}

async function countRows(table) {
    if (!(await tableExists(table))) return null;
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
    return Number(rows?.[0]?.c ?? 0);
}

async function printSummary(title, tables) {
    console.log(`\n${title}`);
    console.log('─'.repeat(50));
    for (const t of tables) {
        const n = await countRows(t);
        if (n === null) console.log(`  ${t.padEnd(32)} (tablo yok)`);
        else console.log(`  ${t.padEnd(32)} ${n} kayıt`);
    }
}

async function runReset(dryRun) {
    await sequelize.authenticate();
    console.log('✅ Veritabanı bağlantısı OK');
    console.log(`Mod: ${dryRun ? 'ÖNİZLEME (dry-run)' : 'SİLME (gerçek)'}`);

    await printSummary('Korunan tablolar', TABLES_KEPT);
    await printSummary('Silinecek tablolar', TABLES_TO_TRUNCATE);

    const reservedBefore = await sequelize.query(
        `SELECT COALESCE(SUM(reserved), 0) AS s FROM product_warehouse_stocks`,
    ).then(([r]) => Number(r?.[0]?.s || 0));
    console.log(`\nRezerve stok (product_warehouse_stocks): ${reservedBefore}`);

    if (dryRun) {
        console.log('\n⚠️  Gerçek silme için: node scripts/reset-transactional-data.js --confirm YES');
        return;
    }

    const t = await sequelize.transaction();
    try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

        for (const table of TABLES_TO_TRUNCATE) {
            if (!(await tableExists(table))) {
                console.log(`⏭️  ${table} — atlandı (tablo yok)`);
                continue;
            }
            await sequelize.query(`TRUNCATE TABLE \`${table}\``, { transaction: t });
            console.log(`🗑️  ${table} — sıfırlandı`);
        }

        if (await tableExists('product_warehouse_stocks')) {
            await sequelize.query(
                'UPDATE `product_warehouse_stocks` SET `reserved` = 0',
                { transaction: t },
            );
            console.log('🔄 product_warehouse_stocks.reserved → 0');
        }

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
        await t.commit();
        console.log('\n✅ İşlem tamamlandı.');
    } catch (err) {
        await t.rollback();
        throw err;
    }

    await printSummary('Silme sonrası (korunan)', TABLES_KEPT);
    await printSummary('Silme sonrası (silinen)', TABLES_TO_TRUNCATE);
}

const args = process.argv.slice(2);
const confirm = args.includes('--confirm') && args[args.indexOf('--confirm') + 1] === 'YES';
const dryRun = !confirm;

runReset(dryRun)
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Hata:', err.message);
        process.exit(1);
    })
    .finally(() => sequelize.close());
