/**
 * Sequelize sync({ alter: true }) + User.email unique: true kombinasyonu,
 * MySQL'de her seferinde yeni indeks ekleyerek "Too many keys specified" hatasına yol açabiliyor.
 *
 * Bu script users / coupons tablolarındaki gereksiz yinelenen indeksleri siler (PRIMARY kalır).
 * Ardından sunucuyu normal şekilde başlatın; sync tek named unique indeksi yeniden oluşturur.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sequelize = require('../config/database');

const safeIdent = (name) =>
    String(name).replace(/[^a-zA-Z0-9_]/g, '');

async function dropNonPrimaryIndexes(tableName) {
    const [rows] = await sequelize.query(`SHOW INDEX FROM \`${safeIdent(tableName)}\``);
    const keyNames = [...new Set(rows.map((r) => r.Key_name).filter((k) => k && k !== 'PRIMARY'))];

    if (keyNames.length === 0) {
        console.log(`[${tableName}] Ek indeks yok.`);
        return;
    }

    if (keyNames.length === 1) {
        console.log(`[${tableName}] Tek ek indeks var (${keyNames[0]}), dokunulmuyor.`);
        return;
    }

    console.log(`[${tableName}] ${keyNames.length} indeks siliniyor: ${keyNames.join(', ')}`);
    const t = safeIdent(tableName);
    for (const kn of keyNames) {
        const k = safeIdent(kn);
        if (!k) continue;
        await sequelize.query(`ALTER TABLE \`${t}\` DROP INDEX \`${k}\``);
    }
}

async function main() {
    await dropNonPrimaryIndexes('users');
    await dropNonPrimaryIndexes('coupons');
    console.log('\nTamam. Şimdi: node server.js (DB_SYNC_ALTER ayarını true yapmayın).');
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
