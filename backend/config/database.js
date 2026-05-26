const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const parseIntEnv = (key, fallback) => {
    const n = parseInt(process.env[key], 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Windows'ta localhost bazen IPv6 (::1) üzerinden bağlanır; MySQL yalnızca 127.0.0.1
 * dinliyorsa ilk uzun işlemde ECONNRESET görülebilir. Sorun yaşanırsa DB_HOST=127.0.0.1 deneyin.
 */
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: parseIntEnv('DB_PORT', 3306),
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
        max: parseIntEnv('DB_POOL_MAX', 10),
        min: 0,
        acquire: parseIntEnv('DB_POOL_ACQUIRE_MS', 120000),
        idle: parseIntEnv('DB_POOL_IDLE_MS', 10000),
        evict: parseIntEnv('DB_POOL_EVICT_MS', 10000),
    },
    dialectOptions: {
        connectTimeout: parseIntEnv('DB_CONNECT_TIMEOUT_MS', 60000),
    },
    retry: {
        max: 3,
    },
});

module.exports = sequelize;
