const { Op } = require('sequelize');
const ProductQuestion = require('../models/ProductQuestion');

/** @param {import('../models/ProductQuestion')} row */
function serializeQuestion(row) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const answer =
        typeof plain.answer === 'string' && plain.answer.trim() ? plain.answer.trim() : null;
    return {
        id: plain.id,
        productId: plain.productId,
        userId: plain.userId,
        authorName: plain.authorName,
        question: plain.question,
        answer,
        answeredAt: plain.answeredAt || null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
        isAnswered: Boolean(answer),
    };
}

async function countAnsweredQuestions(productId) {
    return ProductQuestion.count({
        where: {
            productId,
            answer: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        },
    });
}

/**
 * @param {string} productId
 * @param {string | null | undefined} viewerUserId
 */
async function listPublicProductQuestions(productId, viewerUserId) {
    const answeredClause = {
        answer: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
    };

    const where = viewerUserId
        ? {
              productId,
              [Op.or]: [answeredClause, { userId: viewerUserId }],
          }
        : {
              productId,
              ...answeredClause,
          };

    const rows = await ProductQuestion.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 100,
    });

    const answeredCount = await countAnsweredQuestions(productId);

    return {
        questions: rows.map(serializeQuestion),
        stats: { questionCount: answeredCount },
    };
}

module.exports = {
    serializeQuestion,
    countAnsweredQuestions,
    listPublicProductQuestions,
};
