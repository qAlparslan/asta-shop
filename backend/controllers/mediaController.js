const fs = require('fs');
const path = require('path');
const { resolveSafeUploadFile } = require('../utils/uploadsPath');

const MIME_BY_EXT = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.avif': 'image/avif',
};

/**
 * GET /api/media?path=site/logo.png
 * aaPanel'in `*.jpg|*.png` statik location'ı `/uploads/foto.jpg` isteklerini
 * dist klasöründe aradığı için görseller 404 HTML oluyordu; bu uç aynı `/api/`
 * proxy'sinden geçer (URL .jpg ile bitmez).
 */
exports.serveUpload = (req, res) => {
    const abs = resolveSafeUploadFile(String(req.query.path || ''));
    if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return res.status(404).json({ status: 'fail', message: 'Dosya bulunamadı.' });
    }
    const ext = path.extname(abs).toLowerCase();
    const type = MIME_BY_EXT[ext];
    if (type) res.type(type);
    res.set('Cache-Control', 'public, max-age=604800');
    return res.sendFile(abs);
};
