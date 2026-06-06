const { Op } = require('sequelize');
const ProductQuestion = require('../models/ProductQuestion');
const Product = require('../models/Product');
const { logAdminAudit } = require('../services/auditService');
const { serializeQuestion } = require('../services/productQuestionService');

/** Admin: ürün soruları listesi */
exports.list = async (req, res) => {
    try {
        const raw = String(req.query.status || 'unanswered').toLowerCase();
        /** @type {import('sequelize').WhereOptions} */
        const where = {};
        if (raw === 'unanswered') {
            where[Op.or] = [{ answer: null }, { answer: '' }];
        } else if (raw === 'answered') {
            where.answer = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] };
        }

        const questions = await ProductQuestion.findAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'slug'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(req.query.limit || '200', 10) || 200, 500),
        });

        res.status(200).json({ status: 'success', data: { questions } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** Admin: soruya cevap ver veya güncelle */
exports.answer = async (req, res) => {
    try {
        const answer = typeof req.body.answer === 'string' ? req.body.answer.trim() : '';
        if (answer.length < 2) {
            return res.status(400).json({ status: 'fail', message: 'Cevap en az 2 karakter olmalı.' });
        }
        if (answer.length > 4000) {
            return res.status(400).json({ status: 'fail', message: 'Cevap çok uzun.' });
        }

        const question = await ProductQuestion.findByPk(req.params.id);
        if (!question) {
            return res.status(404).json({ status: 'fail', message: 'Soru bulunamadı.' });
        }

        await question.update({
            answer,
            answeredAt: new Date(),
            answeredByUserId: req.user?.id || null,
        });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'product_question.answer',
            entityType: 'product_question',
            entityId: question.id,
            meta: {
                productId: question.productId,
                authorName: question.authorName,
            },
        });

        res.status(200).json({
            status: 'success',
            message: 'Cevap kaydedildi.',
            data: { question: serializeQuestion(question) },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
