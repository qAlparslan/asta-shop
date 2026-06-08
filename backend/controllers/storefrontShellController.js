const fs = require('fs/promises');
const path = require('path');
const Product = require('../models/Product');
const { injectHtmlSeo } = require('../utils/injectHtmlSeo');
const { generateProductSeo } = require('../utils/productSeoGenerator');
const { resolvePublicSiteBaseFromRequest } = require('../utils/publicSiteUrl');
const { stripToPlainText } = require('../utils/htmlSanitize');

const DEFAULT_STORE_NAME = 'Asta Ticaret';

function resolveDistIndexPath() {
    const custom = (process.env.FRONTEND_DIST_PATH || '').trim();
    if (custom) {
        return path.join(custom, 'index.html');
    }
    return path.join(__dirname, '..', '..', 'dist', 'index.html');
}

/** @param {unknown} images @param {string} base */
function firstImageAbsolute(images, base) {
    const arr = Array.isArray(images) ? images : [];
    const raw = arr[0] ? String(arr[0]).trim() : '';
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const root = (base || '').replace(/\/$/, '');
    return `${root}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

/** @param {import('express').Request} req @param {import('sequelize').Model | null} product */
function buildProductShellSeo(req, product) {
    const siteBase = resolvePublicSiteBaseFromRequest(req);
    const storeName = (process.env.STORE_NAME || DEFAULT_STORE_NAME).trim() || DEFAULT_STORE_NAME;
    const name = stripToPlainText(product?.name || '').trim();
    const brand = stripToPlainText(product?.brand || '').trim();
    const category = stripToPlainText(product?.category || '').trim();
    const description = product?.description || '';
    const slug = String(product?.slug || '').trim();

    const generated = generateProductSeo({
        name,
        brand,
        category,
        description,
        siteLabel: storeName.toUpperCase(),
    });

    const metaTitle =
        (typeof product?.meta_title === 'string' && product.meta_title.trim()) || generated.meta_title;
    const metaDesc =
        (typeof product?.meta_description === 'string' && product.meta_description.trim()) ||
        generated.meta_description;

    const canonicalPath = slug ? `/urun/${slug}` : product?.id ? `/urun/p/${product.id}` : '/urunler';
    const canonical = siteBase ? `${siteBase}${canonicalPath}` : canonicalPath;
    const imageAbs = firstImageAbsolute(product?.images, siteBase);
    const homeUrl = siteBase ? `${siteBase}/` : '/';
    const productsUrl = siteBase ? `${siteBase}/urunler` : '/urunler';

    const breadcrumbItems = [
        { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: homeUrl },
        { '@type': 'ListItem', position: 2, name: 'Ürünler', item: productsUrl },
    ];
    if (category) {
        const catUrl = `${productsUrl}?kategori=${encodeURIComponent(category)}`;
        breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: category, item: catUrl });
        breadcrumbItems.push({ '@type': 'ListItem', position: 4, name, item: canonical });
    } else {
        breadcrumbItems.push({ '@type': 'ListItem', position: 3, name, item: canonical });
    }

    const productNode = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description: metaDesc,
        sku: String(product?.id || ''),
        ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
        ...(imageAbs ? { image: [imageAbs] } : {}),
        offers: {
            '@type': 'Offer',
            priceCurrency: 'TRY',
            price: Number(product?.price) || 0,
            availability:
                (product?.stock ?? 0) > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
            url: canonical,
            seller: { '@type': 'Organization', name: storeName },
        },
    };

    return {
        title: metaTitle,
        description: metaDesc,
        canonical,
        ogType: 'product',
        ogImage: imageAbs,
        siteName: storeName,
        robots: 'index, follow',
        jsonLd: [
            productNode,
            {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: breadcrumbItems,
            },
        ],
    };
}

async function readIndexHtml() {
    const indexPath = resolveDistIndexPath();
    return fs.readFile(indexPath, 'utf8');
}

async function serveShell(req, res, product) {
    try {
        const html = await readIndexHtml();
        const seo = product ? buildProductShellSeo(req, product) : null;
        const body = seo ? injectHtmlSeo(html, seo) : html;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(body);
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            return res
                .status(503)
                .type('text/plain')
                .send('FRONTEND_DIST_PATH veya dist/index.html bulunamadi.');
        }
        console.error('storefrontShell:', err.message);
        res.status(500).type('text/plain').send('Sayfa sunulamadi.');
    }
}

exports.serveProductBySlug = async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim();
        const product = slug
            ? await Product.findOne({
                  where: { slug, is_active: true },
                  attributes: [
                      'id',
                      'name',
                      'brand',
                      'category',
                      'description',
                      'price',
                      'stock',
                      'slug',
                      'meta_title',
                      'meta_description',
                      'images',
                  ],
              })
            : null;
        return serveShell(req, res, product);
    } catch (err) {
        console.error('storefrontShell slug:', err.message);
        return serveShell(req, res, null);
    }
};

exports.serveProductById = async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        const product = id
            ? await Product.findOne({
                  where: { id, is_active: true },
                  attributes: [
                      'id',
                      'name',
                      'brand',
                      'category',
                      'description',
                      'price',
                      'stock',
                      'slug',
                      'meta_title',
                      'meta_description',
                      'images',
                  ],
              })
            : null;
        return serveShell(req, res, product);
    } catch (err) {
        console.error('storefrontShell id:', err.message);
        return serveShell(req, res, null);
    }
};
