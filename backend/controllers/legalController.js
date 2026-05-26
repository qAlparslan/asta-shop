const { mergeAllPagesForApi, buildVersionsResponse, mergeLegalPage, loadStoredPagesObject } = require('../services/legalPagesMerge');

exports.getVersions = async (_req, res) => {
    try {
        const merged = await mergeAllPagesForApi();
        res.status(200).json({
            status: 'success',
            data: buildVersionsResponse(merged),
        });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message || 'Yasal sürümler alınamadı.' });
    }
};

/** GET /api/legal/content/:slug — mağaza yasal sayfaları */
exports.getContent = async (req, res) => {
    try {
        const slug = String(req.params.slug || '')
            .trim()
            .toLowerCase();
        const stored = await loadStoredPagesObject();
        const doc = mergeLegalPage(slug, stored);
        if (!doc) {
            return res.status(404).json({ status: 'fail', message: 'Yasal sayfa bulunamadı.' });
        }
        res.status(200).json({
            status: 'success',
            data: doc,
        });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message || 'İçerik alınamadı.' });
    }
};
