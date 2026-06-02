const EmailAutomation = require('../models/EmailAutomation');
const { logAdminAudit } = require('../services/auditService');

const TRIGGER_TYPES = new Set(['days_after_signup_no_order', 'days_after_last_order']);
const REPEAT_MODES = new Set(['once', 'recurring']);

const clampStr = (v, n) => String(v ?? '').trim().slice(0, n);

function parseDateOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d; // undefined = geçersiz
}

/** Gövdeden doğrulanmış otomasyon alanlarını çıkarır. create=true ise zorunluları kontrol eder. */
function buildPayload(body, { partial = false } = {}) {
    const out = {};
    const errors = [];

    if (!partial || body.name !== undefined) {
        const name = clampStr(body.name, 150);
        if (!name) errors.push('Ad zorunludur.');
        out.name = name;
    }
    if (!partial || body.triggerType !== undefined) {
        const t = clampStr(body.triggerType, 60);
        if (!TRIGGER_TYPES.has(t)) errors.push('Geçersiz tetikleyici türü.');
        else out.triggerType = t;
    }
    if (!partial || body.triggerDays !== undefined) {
        const n = Number(body.triggerDays);
        if (!Number.isFinite(n) || n < 0 || n > 3650) errors.push('Gün değeri 0–3650 arasında olmalı.');
        else out.triggerDays = Math.floor(n);
    }
    if (!partial || body.subject !== undefined) {
        const subject = clampStr(body.subject, 500);
        if (!subject) errors.push('Konu zorunludur.');
        out.subject = subject;
    }
    if (!partial || body.bodyHtml !== undefined) {
        const bodyHtml = String(body.bodyHtml ?? '').trim().slice(0, 100000);
        if (!bodyHtml) errors.push('İçerik zorunludur.');
        out.bodyHtml = bodyHtml;
    }
    if (!partial || body.ctaText !== undefined) {
        out.ctaText = clampStr(body.ctaText, 120) || null;
    }
    if (!partial || body.ctaPath !== undefined) {
        let p = clampStr(body.ctaPath, 500);
        if (p && !/^\/[^\s]*$/.test(p)) errors.push('Buton bağlantısı "/" ile başlamalı (örn. /urunler).');
        out.ctaPath = p || '/urunler';
    }
    if (!partial || body.repeatMode !== undefined) {
        const m = clampStr(body.repeatMode, 20);
        if (!REPEAT_MODES.has(m)) errors.push('Geçersiz tekrar modu.');
        else out.repeatMode = m;
    }
    if (!partial || body.repeatDays !== undefined) {
        if (body.repeatDays === null || body.repeatDays === '') {
            out.repeatDays = null;
        } else {
            const n = Number(body.repeatDays);
            if (!Number.isFinite(n) || n < 1 || n > 3650) errors.push('Tekrar aralığı 1–3650 gün olmalı.');
            else out.repeatDays = Math.floor(n);
        }
    }
    if (!partial || body.startAt !== undefined) {
        const d = parseDateOrNull(body.startAt);
        if (d === undefined) errors.push('Geçersiz başlangıç tarihi.');
        else out.startAt = d;
    }
    if (!partial || body.endAt !== undefined) {
        const d = parseDateOrNull(body.endAt);
        if (d === undefined) errors.push('Geçersiz bitiş tarihi.');
        else out.endAt = d;
    }
    if (!partial || body.enabled !== undefined) {
        out.enabled = body.enabled === true || body.enabled === 'true';
    }

    // recurring modda repeatDays zorunlu
    const finalMode = out.repeatMode;
    if (finalMode === 'recurring' && (out.repeatDays === null || out.repeatDays === undefined) && !partial) {
        errors.push('Tekrarlayan modda tekrar aralığı (gün) gereklidir.');
    }
    if (out.startAt && out.endAt && out.startAt > out.endAt) {
        errors.push('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
    }

    return { out, errors };
}

// GET /api/email-automations
exports.list = async (_req, res) => {
    try {
        const rows = await EmailAutomation.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ status: 'success', data: { automations: rows } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// POST /api/email-automations
exports.create = async (req, res) => {
    try {
        const { out, errors } = buildPayload(req.body || {}, { partial: false });
        if (errors.length) {
            return res.status(400).json({ status: 'fail', message: errors[0], errors });
        }
        const row = await EmailAutomation.create(out);
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'email_automation.create',
            entityType: 'email_automation',
            entityId: row.id,
            meta: { name: row.name, triggerType: row.triggerType },
        });
        res.status(201).json({ status: 'success', data: { automation: row } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// PUT /api/email-automations/:id
exports.update = async (req, res) => {
    try {
        const row = await EmailAutomation.findByPk(req.params.id);
        if (!row) return res.status(404).json({ status: 'fail', message: 'Otomasyon bulunamadı.' });

        const { out, errors } = buildPayload(req.body || {}, { partial: true });
        // recurring + repeatDays tutarlılığı (güncel duruma göre)
        const nextMode = out.repeatMode ?? row.repeatMode;
        const nextRepeat = out.repeatDays !== undefined ? out.repeatDays : row.repeatDays;
        if (nextMode === 'recurring' && (nextRepeat === null || nextRepeat === undefined)) {
            errors.push('Tekrarlayan modda tekrar aralığı (gün) gereklidir.');
        }
        if (errors.length) {
            return res.status(400).json({ status: 'fail', message: errors[0], errors });
        }

        await row.update(out);
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'email_automation.update',
            entityType: 'email_automation',
            entityId: row.id,
            meta: { keys: Object.keys(out) },
        });
        res.json({ status: 'success', data: { automation: row } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// DELETE /api/email-automations/:id
exports.remove = async (req, res) => {
    try {
        const row = await EmailAutomation.findByPk(req.params.id);
        if (!row) return res.status(404).json({ status: 'fail', message: 'Otomasyon bulunamadı.' });
        const name = row.name;
        await row.destroy();
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'email_automation.delete',
            entityType: 'email_automation',
            entityId: req.params.id,
            meta: { name },
        });
        res.json({ status: 'success', data: { id: req.params.id } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// POST /api/email-automations/:id/run-now — kuralı hemen tek sefer çalıştırır
exports.runNow = async (req, res) => {
    try {
        const row = await EmailAutomation.findByPk(req.params.id);
        if (!row) return res.status(404).json({ status: 'fail', message: 'Otomasyon bulunamadı.' });

        const { _processAutomation } = require('../services/automatedReminders');
        // run-now için enabled koşulunu geçici olarak atla
        const wasEnabled = row.enabled;
        if (!wasEnabled) row.set('enabled', true);
        const result = await _processAutomation(row);
        if (!wasEnabled) {
            // DB'de enabled durumunu bozmayalım
            await row.update({ enabled: false });
        }

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'email_automation.run_now',
            entityType: 'email_automation',
            entityId: row.id,
            meta: { result },
        });
        res.json({ status: 'success', data: { result } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
