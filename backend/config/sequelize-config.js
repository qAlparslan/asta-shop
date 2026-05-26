const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const shared = {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
};

module.exports = {
    development: { ...shared },
    production: { ...shared },
};
