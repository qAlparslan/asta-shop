const jwt = require('jsonwebtoken');
const ConsentEvent = require('../models/ConsentEvent');
const { getMergedVersionPins } = require('../services/legalPagesMerge');
const { hashIp } = require('../services/auditService');

function optionalUserId(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer')) return null;
    try {
        const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
        return decoded.id || null;
    } catch {
        return null;
    }
}

/**
 * Cookie banner veya profil dışı rıza kaydı.
 * body: visitorKey, channel, privacyVersion, kvkkVersion, cookiePolicyVersion,
 *       cookiePreferences, collectionMethod, marketingAccepted?
 */
exports.recordEvent = async (req, res) => {
    try {
        const {
            visitorKey,
            channel = 'cookie_banner',
            privacyVersion,
            kvkkVersion,
            cookiePolicyVersion,
            termsOfUseVersion,
            cookiePreferences,
            collectionMethod,
            marketingAccepted,
        } = req.body;

        if (!privacyVersion || !kvkkVersion || !cookiePolicyVersion || !termsOfUseVersion || !collectionMethod) {
            return res.status(400).json({
                status: 'fail',
                message:
                    'privacyVersion, kvkkVersion, cookiePolicyVersion, termsOfUseVersion ve collectionMethod zorunludur.',
            });
        }

        const pins = await getMergedVersionPins();
        if (
            privacyVersion !== pins.privacyVersion ||
            kvkkVersion !== pins.kvkkVersion ||
            cookiePolicyVersion !== pins.cookiePolicyVersion ||
            termsOfUseVersion !== pins.termsOfUseVersion
        ) {
            return res.status(400).json({
                status: 'fail',
                message:
                    'Yasal metin sürümleri güncellendi. Lütfen sayfayı yenileyip tekrar onaylayın.',
            });
        }

        const allowedChannels = ['cookie_banner', 'account_settings', 'api'];
        if (!allowedChannels.includes(channel)) {
            return res.status(400).json({ status: 'fail', message: 'Geçersiz channel.' });
        }

        const userId = optionalUserId(req);

        await ConsentEvent.create({
            userId,
            visitorKey: visitorKey ? String(visitorKey).slice(0, 64) : null,
            channel,
            privacyVersion,
            kvkkVersion,
            cookiePolicyVersion,
            termsOfUseVersion,
            marketingAccepted:
                typeof marketingAccepted === 'boolean' ? marketingAccepted : null,
            cookiePreferences: cookiePreferences && typeof cookiePreferences === 'object'
                ? cookiePreferences
                : null,
            collectionMethod: String(collectionMethod).slice(0, 100),
            userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
            ipHash: hashIp(req.ip || req.socket?.remoteAddress),
        });

        res.status(201).json({ status: 'success', message: 'Rıza kaydı alındı.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
