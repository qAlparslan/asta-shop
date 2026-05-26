const { Op } = require('sequelize');
const Campaign = require('../models/Campaign');
const campaignController = require('../controllers/campaignController');

/**
 * Her dakika çalışır:
 *   status='scheduled' ve scheduledAt <= now olan kampanyaları bulur
 *   ve executeCampaign() ile asenkron olarak başlatır.
 */
let timer = null;
let busy = false;

async function tick() {
    if (busy) return;
    busy = true;
    try {
        const now = new Date();
        const due = await Campaign.findAll({
            where: {
                status: 'scheduled',
                scheduledAt: { [Op.lte]: now },
            },
            order: [['scheduledAt', 'ASC']],
            limit: 5,
        });

        for (const c of due) {
            console.log(`📅 Scheduler: kampanya ${c.id} ("${c.title}") çalıştırılıyor`);
            await c.update({ status: 'sending' });
            // sıralı: rate-limit kontrolü için
            await campaignController._executeCampaign(c).catch((e) => {
                console.error('Scheduler execute hatası:', e.message);
            });
        }
    } catch (err) {
        console.error('campaignScheduler.tick hatası:', err.message);
    } finally {
        busy = false;
    }
}

function start() {
    if (timer) return;
    console.log('🗓️  Kampanya zamanlayıcısı aktif (60sn aralık).');
    // Hemen bir kez (boot sırasında geçmiş kalmışları yakala), sonra her 60sn'de bir
    setTimeout(tick, 5_000);
    timer = setInterval(tick, 60_000);
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

module.exports = { start, stop };
