const Product = require('../models/Product');
const Category = require('../models/Category');
const { resolvePublicSiteBaseFromRequest } = require('../utils/publicSiteUrl');

/**
 * Basit XML site haritası — ürün ve statik sayfalar.
 */
exports.serveSitemap = async (req, res) => {
    try {
        const base = resolvePublicSiteBaseFromRequest(req);
        if (!base) {
            return res
                .status(503)
                .type('text/plain')
                .send('Site tabani URL tanimli degil (FRONTEND_PUBLIC_URL veya FRONTEND_ORIGINS).');
        }

        const products = await Product.findAll({
            where: { is_active: true },
            attributes: ['slug', 'updatedAt'],
        });

        let categories = [];
        try {
            categories = await Category.findAll({
                where: { isActive: true },
                attributes: ['slug', 'name', 'updatedAt'],
            });
        } catch (catErr) {
            console.warn('sitemap categories:', catErr.message);
        }

        const urlEntries = [];

        const pushUrl = (loc, changefreq, priority, lastmod) => {
            const d = lastmod ? new Date(lastmod).toISOString().split('T')[0] : null;
            urlEntries.push(
                `<url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${
                    d ? `<lastmod>${d}</lastmod>` : ''
                }</url>`
            );
        };

        pushUrl(`${base}/`, 'daily', '1.0', new Date());
        pushUrl(`${base}/urunler`, 'daily', '0.9', new Date());
        pushUrl(`${base}/hakkimizda`, 'monthly', '0.6', null);
        pushUrl(`${base}/iletisim`, 'monthly', '0.6', null);

        const legalSlugs = [
            'gizlilik',
            'kvkk',
            'cerez',
            'kullanim',
            'on-bilgilendirme',
            'mesafeli-satis',
            'iade',
        ];
        for (const legalSlug of legalSlugs) {
            pushUrl(`${base}/yasal/${legalSlug}`, 'monthly', '0.4', null);
        }

        for (const p of products) {
            if (p.slug) {
                pushUrl(`${base}/urun/${encodeURIComponent(p.slug)}`, 'weekly', '0.8', p.updatedAt);
            }
        }

        for (const c of categories) {
            if (c.name) {
                const q = encodeURIComponent(c.name);
                pushUrl(`${base}/urunler?kategori=${q}`, 'weekly', '0.7', c.updatedAt);
            }
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    } catch (err) {
        console.error('sitemap:', err.message);
        if (err.stack) console.error(err.stack);
        res.status(500).type('text/plain').send('Sitemap oluşturulamadı.');
    }
};
