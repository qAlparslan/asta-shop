const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sentryService = require('./services/sentryService');

const parseOrigins = () => {
    const raw = process.env.FRONTEND_ORIGINS;
    if (raw && raw.trim()) {
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return ['http://localhost:3000', 'http://localhost:3001'];
};

/**
 * Express uygulaması (DB dinleme yok) — test ve sunucu ortak.
 */
function buildApp() {
    const app = express();

    sentryService.setupRequestHandler();

    if (process.env.TRUST_PROXY === 'true') {
        app.set('trust proxy', 1);
    }

    app.use(helmet({
        crossOriginResourcePolicy: false,
    }));

    app.use(cors({
        origin: parseOrigins(),
        credentials: true,
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/api/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
            env: process.env.NODE_ENV || 'development',
        });
    });

    const mailWebhookRoutes = require('./routes/mailWebhookRoutes');
    app.use('/api/webhooks/mail-feedback', mailWebhookRoutes);

    const paymentRoutes = require('./routes/paymentRoutes');
    app.use('/api/payments', paymentRoutes);

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    const authRoutes = require('./routes/authRoutes');
    const productRoutes = require('./routes/productRoutes');
    const orderRoutes = require('./routes/orderRoutes');
    const couponRoutes = require('./routes/couponRoutes');
    const userRoutes = require('./routes/userRoutes');
    const categoryRoutes = require('./routes/categoryRoutes');
    const siteSettingRoutes = require('./routes/siteSettingRoutes');
    const newsletterRoutes = require('./routes/newsletterRoutes');
    const campaignRoutes = require('./routes/campaignRoutes');
    const inventoryRoutes = require('./routes/inventoryRoutes');
    const sitemapController = require('./controllers/sitemapController');
    const legalRoutes = require('./routes/legalRoutes');
    const consentRoutes = require('./routes/consentRoutes');
    const auditRoutes = require('./routes/auditRoutes');
    const homeHeroRoutes = require('./routes/homeHeroRoutes');
    const emailMetricsRoutes = require('./routes/emailMetricsRoutes');
    const adminProductReviewRoutes = require('./routes/adminProductReviewRoutes');
    const parasutRoutes = require('./routes/parasutRoutes');

    app.use('/api/inventory', inventoryRoutes);
    app.get('/sitemap.xml', sitemapController.serveSitemap);

    app.use('/api/legal', legalRoutes);
    app.use('/api/consent', consentRoutes);
    app.use('/api/audit-logs', auditRoutes);
    app.use('/api/email-metrics', emailMetricsRoutes);
    app.use('/api/admin/product-reviews', adminProductReviewRoutes);
    app.use('/api/integrations/parasut', parasutRoutes);

    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/coupons', couponRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/settings', siteSettingRoutes);
    app.use('/api/newsletter', newsletterRoutes);
    app.use('/api/campaigns', campaignRoutes);
    app.use('/api/home-hero', homeHeroRoutes);

    app.get('/', (req, res) => {
        res.send('Asta Ticaret Backend API Çalışıyor 🚀');
    });

    sentryService.setupErrorHandler(app);

    return app;
}

module.exports = { buildApp, parseOrigins };
