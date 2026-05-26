const { mergeAllPagesForApi, validateAdminPayloadPages, persistPages } = require('../services/legalPagesMerge');
const { logAdminAudit } = require('../services/auditService');

exports.getBundle = async (_req, res) => {
    try {
        const pages = await mergeAllPagesForApi();
        res.status(200).json({ status: 'success', data: { pages } });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message || 'Yasal metinler yüklenemedi.' });
    }
};

exports.putBundle = async (req, res) => {
    try {
        const { pages } = validateAdminPayloadPages(req.body);
        await persistPages(pages);
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'legal_documents.update',
            entityType: 'site_setting',
            entityId: 'legalDocumentsJson',
            meta: { slugCount: Object.keys(pages).length },
        });
        const fresh = await mergeAllPagesForApi();
        res.status(200).json({ status: 'success', data: { pages: fresh } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message || 'Kayıt başarısız.' });
    }
};
