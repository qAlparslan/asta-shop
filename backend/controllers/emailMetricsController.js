const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const EmailLog = require('../models/EmailLog');
const EmailDeliveryFeedback = require('../models/EmailDeliveryFeedback');

/**
 * Gönderim panosu özeti — admin (Sistem › Mail son N gün).
 */
exports.summary = async (req, res) => {
    try {
        const sinceDaysRaw = Number.parseInt(req.query.sinceDays, 10);
        const periodDays = Number.isFinite(sinceDaysRaw)
            ? Math.min(Math.max(sinceDaysRaw, 1), 366)
            : 30;

        const since = new Date(Date.now() - periodDays * 86400000);

        const totals = await EmailLog.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
            where: { createdAt: { [Op.gte]: since } },
            group: ['status'],
            raw: true,
        });

        let successPeriod = 0;
        let failedPeriod = 0;
        for (const row of totals) {
            const n = Number(row.n || 0);
            if (row.status === 'success') successPeriod += n;
            if (row.status === 'failed') failedPeriod += n;
        }
        const attempted = successPeriod + failedPeriod;

        const byType = await sequelize.query(
            `SELECT \`type\`,
               SUM(CASE WHEN \`status\` = 'success' THEN 1 ELSE 0 END) AS \`success\`,
               SUM(CASE WHEN \`status\` = 'failed' THEN 1 ELSE 0 END) AS \`failed\`,
               COUNT(*) AS \`total\`
             FROM email_logs
             WHERE \`createdAt\` >= :since
             GROUP BY \`type\``,
            { replacements: { since }, type: QueryTypes.SELECT },
        );

        const feedbackRows = await EmailDeliveryFeedback.findAll({
            attributes: ['kind', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
            where: { createdAt: { [Op.gte]: since } },
            group: ['kind'],
            raw: true,
        });

        const feedbackByKind = {};
        let feedbackTotal = 0;
        for (const row of feedbackRows) {
            const n = Number(row.n || 0);
            feedbackByKind[row.kind] = n;
            feedbackTotal += n;
        }

        res.status(200).json({
            status: 'success',
            data: {
                periodDays,
                sends: {
                    attempted,
                    success: successPeriod,
                    failed: failedPeriod,
                    successRate: attempted
                        ? Math.round((successPeriod / attempted) * 1000) / 1000
                        : null,
                    byType: (byType || []).map((r) => ({
                        type: r.type,
                        total: Number(r.total || 0),
                        success: Number(r.success || 0),
                        failed: Number(r.failed || 0),
                    })),
                },
                webhookFeedback: {
                    total: feedbackTotal,
                    byKind: feedbackByKind,
                },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
