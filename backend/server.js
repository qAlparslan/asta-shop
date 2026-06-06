const path = require('path');
// Tek kaynak — `backend/.env` (Vite da vite.config ile buradan okur)
require('dotenv').config({ path: path.join(__dirname, '.env') });

require('./config/requireProductionEnv')();

const sequelize = require('./config/database');

// --- MODELLERİ ÇAĞIR (ilişki tanımları route'lardan önce) ---
const User = require('./models/User');
require('./models/Product');
require('./models/Order');
require('./models/Coupon');
require('./models/Category');
require('./models/SiteSetting');
require('./models/EmailLog');
require('./models/NewsletterSubscriber');
require('./models/Campaign');
require('./models/Warehouse');
require('./models/ProductWarehouseStock');
require('./models/ConsentEvent');
require('./models/ContactMessage');
require('./models/EmailAutomation');
const AdminAuditLog = require('./models/AdminAuditLog');
require('./models/HomeHeroSlide');
const Product = require('./models/Product');
const ProductReview = require('./models/ProductReview');
require('./models/ProductStockAlert');

ProductReview.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

AdminAuditLog.belongsTo(User, { foreignKey: 'adminUserId', as: 'admin' });

const { buildApp } = require('./expressApp');
const app = buildApp();

const PORT = process.env.PORT || 5000;

const useAlterSync = process.env.DB_SYNC_ALTER === 'true';

const ensureCouponColumns = require('./utils/ensureCouponColumns');
const ensureProductColumns = require('./utils/ensureProductColumns');
const ensureUserColumns = require('./utils/ensureUserColumns');
const ensureEmailLogColumns = require('./utils/ensureEmailLogColumns');
const ensureOrderStatusEnum = require('./utils/ensureOrderStatusEnum');
const ensureOrderUserIdColumn = require('./utils/ensureOrderUserIdColumn');
const ensureOrderEInvoiceColumns = require('./utils/ensureOrderEInvoiceColumns');
const ensureOrderCouponCodeColumn = require('./utils/ensureOrderCouponCodeColumn');
const ensureOrderShipmentColumns = require('./utils/ensureOrderShipmentColumns');
const ensureCategoryMetaColumns = require('./utils/ensureCategoryMetaColumns');
const ensureConsentEventTermsColumn = require('./utils/ensureConsentEventTermsColumn');
const ensureEmailDeliveryFeedbackTable = require('./utils/ensureEmailDeliveryFeedbackTable');
const ensureProductReviewApprovedColumn = require('./utils/ensureProductReviewApprovedColumn');
const ensureProductReviewNotifyEmailColumn = require('./utils/ensureProductReviewNotifyEmailColumn');
const ensureProductReviewImagesColumn = require('./utils/ensureProductReviewImagesColumn');
const ensureHomeHeroColumns = require('./utils/ensureHomeHeroColumns');
const ensureAdminAuditLogNullable = require('./utils/ensureAdminAuditLogNullable');
const seedCategories = require('./utils/seedCategories');
const seedSiteSettings = require('./utils/seedSiteSettings');
const seedHomeHeroSlides = require('./utils/seedHomeHeroSlides');
const { migrateLegacyStockToWarehouses } = require('./services/inventoryService');
const { Op } = require('sequelize');

/** İndirim motoru için */
function startDiscountAutomationInterval() {
    setInterval(async () => {
        const now = new Date();
        try {
            const toStart = await Product.findAll({
                where: {
                    discountStartsAt: { [Op.lte]: now },
                    discountPercent: { [Op.gt]: 0 },
                    original_price: { [Op.not]: null },
                    price: { [Op.eq]: sequelize.col('original_price') },
                },
            });

            for (const p of toStart) {
                const currentOriginal = parseFloat(p.original_price);
                const discountPercent = parseInt(p.discountPercent, 10);

                const newPrice = currentOriginal - (currentOriginal * discountPercent) / 100;

                await p.update({ price: newPrice.toFixed(2) });
                console.log(
                    `[OTOMATİK SİSTEM]: ${p.name} için %${discountPercent} indirim uygulandı. Yeni Fiyat: ${newPrice.toFixed(2)}₺`,
                );
            }

            const toEnd = await Product.findAll({
                where: {
                    discountExpiresAt: { [Op.lte]: now },
                    original_price: { [Op.not]: null },
                },
            });

            for (const p of toEnd) {
                await p.update({
                    price: p.original_price,
                    original_price: null,
                    discountPercent: null,
                    discountStartsAt: null,
                    discountExpiresAt: null,
                });
                console.log(`[OTOMATİK SİSTEM]: ${p.name} ürününün indirim süresi bitti. Eski fiyatına döndürüldü.`);
            }
        } catch (err) {
            const code = err.parent?.code || err.original?.code;
            console.error('[İNDİRİM MOTORU]', err.parent?.sqlMessage || err.original?.sqlMessage || err.message);
            if (code === 'ECONNREFUSED' || err.name === 'SequelizeConnectionRefusedError') {
                console.error('→ MySQL bağlantısı yok (servis kapalı olabilir).');
            }
        }
    }, 60000);
}

sequelize
    .authenticate()
    .then(() => {
        console.log('✅ MySQL Veritabanı bağlantısı BAŞARILI!');
        if (useAlterSync) {
            console.log('⚠️  DB_SYNC_ALTER=true — Sequelize ALTER aktif (drop kapalı; iş bitince .env\'de kapatın).');
        }
        // ÖNEMLİ: alter açıkken bile `drop: false` — Sequelize'in mevcut sütunları
        // (örn. barcode) silip verisini uçurmasını engeller. Şema eklemeleri zaten
        // ensure*Columns yardımcılarıyla güvenli şekilde yapılıyor.
        return sequelize.sync(useAlterSync ? { alter: { drop: false } } : {});
    })
    .then(() => ensureCouponColumns())
    .then(() => ensureProductColumns())
    .then(() => ensureUserColumns())
    .then(() => ensureEmailLogColumns())
    .then(() => ensureOrderStatusEnum())
    .then(() => ensureOrderUserIdColumn())
    .then(() => ensureOrderEInvoiceColumns())
    .then(() => ensureOrderCouponCodeColumn())
    .then(() => ensureOrderShipmentColumns())
    .then(() => ensureCategoryMetaColumns())
    .then(() => ensureConsentEventTermsColumn())
    .then(() => ensureEmailDeliveryFeedbackTable())
    .then(() => ensureProductReviewApprovedColumn())
    .then(() => ensureProductReviewNotifyEmailColumn())
    .then(() => ensureProductReviewImagesColumn())
    .then(() => ensureHomeHeroColumns())
    .then(() => ensureAdminAuditLogNullable())
    .then(() => migrateLegacyStockToWarehouses())
    .then(() => seedCategories())
    .then(() => seedSiteSettings())
    .then(() => seedHomeHeroSlides())
    .then(() => {
        console.log(
            `📦 Sequelize sync tamamlandı (${useAlterSync ? 'alter: AÇIK' : 'alter: kapalı — güvenli varsayılan'}).`,
        );
        try {
            require('./services/campaignScheduler').start();
        } catch (e) {
            console.warn('campaignScheduler başlatılamadı:', e.message);
        }
        try {
            require('./services/automatedReminders').start();
        } catch (e) {
            console.warn('automatedReminders başlatılamadı:', e.message);
        }
        setInterval(async () => {
            try {
                const { cancelStalePendingOrders } = require('./services/orderInventory');
                await cancelStalePendingOrders(Number(process.env.PENDING_ORDER_TIMEOUT_MINUTES) || 30);
            } catch (e) {
                console.warn('stale order cleaner:', e.message);
            }
        }, 5 * 60 * 1000);

        app.listen(PORT, () => {
            console.log(`🚀 Sunucu ${PORT} portunda ayaklandı.`);
            startDiscountAutomationInterval();
        });
    })
    .catch((err) => {
        console.error('❌ Backend başlatılamadı — veritabanı adımı başarısız:', err.message);
        const refused =
            err.name === 'SequelizeConnectionRefusedError' ||
            err.parent?.code === 'ECONNREFUSED' ||
            /ECONNREFUSED/i.test(String(err.message || ''));
        if (refused) {
            console.error('→ Bağlantı reddedildi: MySQL servisi çalışmıyor olabilir veya host/port hatalı.');
            console.error(
                '   Kontrol: proje kökü `.env` (veya backend/.env) → DB_HOST=127.0.0.1, DB_PORT=3306, DB_USER, DB_PASS, DB_NAME.',
            );
        }
        process.exit(1);
    });

module.exports = { app };
