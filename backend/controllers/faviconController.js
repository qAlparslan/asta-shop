const path = require('path');
const fs = require('fs');
const SiteSetting = require('../models/SiteSetting');

const fallbackIco = path.join(__dirname, '..', '..', 'public', 'favicon.ico');

exports.serveFavicon = async (_req, res) => {
    try {
        const row = await SiteSetting.findOne({ where: { key: 'logoUrl' } });
        const url = String(row?.value || '').trim();
        if (url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', url.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
                return res.sendFile(filePath);
            }
        }
        if (fs.existsSync(fallbackIco)) {
            return res.sendFile(fallbackIco);
        }
        return res.status(404).end();
    } catch (err) {
        console.error('[favicon]', err.message);
        if (fs.existsSync(fallbackIco)) {
            return res.sendFile(fallbackIco);
        }
        return res.status(404).end();
    }
};
