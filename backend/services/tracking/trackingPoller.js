const { Op } = require('sequelize');
const Order = require('../../models/Order');
const { queryMngTracking, getMngConfig } = require('./mngTrackingClient');
const { sendOrderStatusUpdateEmail } = require('../../controllers/orderController');

let timer = null;
let busy = false;

function isDebug() {
    return process.env.MNG_DEBUG === 'true' || process.env.DHL_DEBUG === 'true';
}

/**
 * Kargodaki siparişler için MNG/DHL eCommerce TR takip sorgusu;
 * teslimde otomatik status günceller.
 */
async function tick() {
    if (busy) return;
    if (process.env.TRACKING_POLL_ENABLED === 'false') return;
    if (!getMngConfig().enabled) return;

    busy = true;
    try {
        const intervalMin = Math.max(Number(process.env.TRACKING_POLL_INTERVAL_MIN) || 15, 5);
        const batchSize = Math.min(Math.max(Number(process.env.TRACKING_POLL_BATCH_SIZE) || 30, 1), 50);
        const cutoff = new Date(Date.now() - intervalMin * 60 * 1000);

        const orders = await Order.findAll({
            where: {
                status: 'kargolandi',
                trackingNumber: { [Op.ne]: null },
                [Op.or]: [
                    { trackingLastCheckedAt: null },
                    { trackingLastCheckedAt: { [Op.lt]: cutoff } },
                ],
            },
            order: [['trackingLastCheckedAt', 'ASC']],
            limit: batchSize,
        });

        if (isDebug()) {
            console.log(`[tracking-poller] tick: ${orders.length} sipariş kontrol edilecek (interval=${intervalMin}dk).`);
        }

        for (const order of orders) {
            const no = String(order.trackingNumber || '').trim();
            if (!no) continue;

            const result = await queryMngTracking(no);
            if (isDebug()) {
                console.log(
                    `[tracking-poller] order#${order.id} no=${no} → ok=${result.ok} status=${result.status || '-'} delivered=${result.delivered} err=${result.error || '-'}`,
                );
            }
            const updates = {
                trackingLastCheckedAt: new Date(),
            };
            if (result.status) {
                updates.trackingProviderStatus = result.status;
            }

            if (result.delivered && order.status === 'kargolandi') {
                await order.update({ ...updates, status: 'teslim-edildi' });
                const snapshot = order.toJSON ? order.toJSON() : { ...order.get(), status: 'teslim-edildi' };
                snapshot.status = 'teslim-edildi';
                sendOrderStatusUpdateEmail(snapshot, 'teslim-edildi');
                if (isDebug()) {
                    console.log('[tracking-poller] teslim-edildi', order.id, no);
                }
            } else {
                await order.update(updates);
            }
        }
    } catch (err) {
        console.warn('[tracking-poller] tick:', err.message);
    } finally {
        busy = false;
    }
}

function start() {
    if (process.env.TRACKING_POLL_ENABLED === 'false') {
        console.log('📦 Kargo takip cron kapalı (TRACKING_POLL_ENABLED=false).');
        return;
    }
    if (!getMngConfig().enabled) {
        console.log(
            '📦 Kargo takip cron: MNG_* / customerNumber / password eksik — otomatik teslim senkronu atlanır.',
        );
        return;
    }
    const intervalMin = Math.max(Number(process.env.TRACKING_POLL_INTERVAL_MIN) || 15, 5);
    const ms = intervalMin * 60 * 1000;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        tick().catch(() => {});
    }, ms);
    setTimeout(() => tick().catch(() => {}), 30 * 1000);
    console.log(`📦 Kargo takip cron başladı (her ${intervalMin} dk, MNG/DHL eCommerce TR).`);
}

function stop() {
    if (timer) clearInterval(timer);
    timer = null;
}

module.exports = { start, stop, tick };
