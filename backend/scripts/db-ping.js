/* eslint-disable no-console */
/**
 * MySQL bağlantı teşhisi.
 *
 * Çalıştırma (backend/ klasöründe):
 *   node scripts/db-ping.js
 *
 * .env dosyasındaki DB_* değerleri ile bağlanmayı dener.
 * Başarılıysa "DB OK · <db_name>" yazar; aksi halde hatayı insan okuyabilir
 * şekilde basıp 1 ile çıkar.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

(async () => {
    const cfg = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || '',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || '',
        connectTimeout: 10_000,
    };

    console.log('Bağlanmaya çalışılıyor:', {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        database: cfg.database,
        password_len: String(cfg.password).length,
    });

    let conn;
    try {
        conn = await mysql.createConnection(cfg);
        const [rows] = await conn.query('SELECT DATABASE() AS db, NOW() AS now');
        console.log('DB OK ·', rows[0]);

        const [tables] = await conn.query('SHOW TABLES');
        console.log('Tablolar (' + tables.length + '):');
        tables.slice(0, 20).forEach((r) => console.log(' -', Object.values(r)[0]));
        if (tables.length > 20) console.log(' ... +' + (tables.length - 20) + ' satır');
    } catch (err) {
        console.error('DB HATA:');
        console.error('  code   :', err.code);
        console.error('  errno  :', err.errno);
        console.error('  message:', err.message);
        if (err.sqlState) console.error('  sqlState:', err.sqlState);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
})();
