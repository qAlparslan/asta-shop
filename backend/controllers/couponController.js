const Coupon = require('../models/Coupon');
const { logAdminAudit } = require('../services/auditService');

const parseDate = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d; // undefined => geçersiz
};

exports.createCoupon = async (req, res) => {
    try {
        const { code, discountPercent, startsAt, expiresAt, minOrderAmount } = req.body;

        if (!code || !String(code).trim()) {
            return res.status(400).json({ status: 'fail', message: 'Kupon kodu zorunludur.' });
        }

        const pct = Number(discountPercent);
        if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
            return res.status(400).json({ status: 'fail', message: 'İndirim yüzdesi 1-99 arası olmalıdır.' });
        }

        const start = parseDate(startsAt);
        const end = parseDate(expiresAt);
        if (start === undefined) {
            return res.status(400).json({ status: 'fail', message: 'Başlangıç tarihi geçersiz.' });
        }
        if (end === undefined) {
            return res.status(400).json({ status: 'fail', message: 'Bitiş tarihi geçersiz.' });
        }
        if (start && end && end.getTime() <= start.getTime()) {
            return res.status(400).json({ status: 'fail', message: 'Bitiş, başlangıçtan sonra olmalıdır.' });
        }

        const minAmount =
            minOrderAmount === '' || minOrderAmount == null ? 0 : Number(minOrderAmount);
        if (!Number.isFinite(minAmount) || minAmount < 0) {
            return res.status(400).json({ status: 'fail', message: 'Min. sepet tutarı geçerli olmalı.' });
        }

        const newCoupon = await Coupon.create({
            code: String(code).toUpperCase().trim(),
            discountPercent: pct,
            startsAt: start,
            expiresAt: end,
            minOrderAmount: minAmount,
        });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'coupon.create',
            entityType: 'coupon',
            entityId: newCoupon.id,
            meta: { code: newCoupon.code },
        });

        res.status(201).json({ status: 'success', data: { coupon: newCoupon } });
    } catch (err) {
        // Tekil indeks ihlali — daha okunabilir mesaj.
        if (err?.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ status: 'fail', message: 'Bu kupon kodu zaten mevcut.' });
        }
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ status: 'success', data: { coupons } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.deleteCoupon = async (req, res) => {
    try {
        const row = await Coupon.findOne({ where: { id: req.params.id } });
        if (!row) {
            return res.status(404).json({ status: 'fail', message: 'Kupon bulunamadı.' });
        }
        const codeSnap = row.code;
        await Coupon.destroy({ where: { id: req.params.id } });
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'coupon.delete',
            entityType: 'coupon',
            entityId: req.params.id,
            meta: { code: codeSnap },
        });
        res.status(200).json({ status: 'success', message: 'Kupon silindi.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.validateCoupon = async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        if (!code) {
            return res.status(400).json({ status: 'fail', message: 'Kupon kodu gerekli.' });
        }

        const coupon = await Coupon.findOne({
            where: { code: String(code).toUpperCase().trim(), isActive: true },
        });
        if (!coupon) {
            return res.status(404).json({ status: 'fail', message: 'Geçersiz kupon kodu.' });
        }

        const now = new Date();

        if (coupon.startsAt && now < new Date(coupon.startsAt)) {
            return res.status(400).json({
                status: 'fail',
                message: `Bu kupon ${new Date(coupon.startsAt).toLocaleString('tr-TR')} tarihinden itibaren geçerli olacak.`,
            });
        }

        // Yeni alan boşsa eski expiryDate'i fallback olarak kullan.
        const effectiveExpiry = coupon.expiresAt || coupon.expiryDate;
        if (effectiveExpiry && now > new Date(effectiveExpiry)) {
            return res.status(400).json({ status: 'fail', message: 'Bu kuponun süresi dolmuş.' });
        }

        const minAmount = Number(coupon.minOrderAmount || 0);
        const total = Number(cartTotal || 0);
        if (minAmount > 0 && total < minAmount) {
            return res.status(400).json({
                status: 'fail',
                message: `Bu kupon için minimum sepet tutarı ${minAmount.toFixed(2)}₺ olmalıdır.`,
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                discountPercent: coupon.discountPercent,
                minOrderAmount: minAmount,
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};