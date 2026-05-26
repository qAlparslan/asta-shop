const { Op } = require('sequelize');
const AdminAuditLog = require('../models/AdminAuditLog');
const User = require('../models/User');

exports.list = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 80, 200);
        const offset = parseInt(req.query.offset, 10) || 0;
        const action = req.query.action;
        const entityType = req.query.entityType;

        const where = {};
        if (action) where.action = { [Op.like]: `%${action}%` };
        if (entityType) where.entityType = entityType;

        const { rows, count } = await AdminAuditLog.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            include: [
                {
                    model: User,
                    as: 'admin',
                    attributes: ['id', 'email', 'fullName', 'role'],
                },
            ],
        });

        res.status(200).json({
            status: 'success',
            data: {
                logs: rows,
                pagination: { total: count, limit, offset },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
