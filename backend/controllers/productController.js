const Product = require('../models/Product');
const { parse } = require('csv-parse/sync');
const { setMainWarehouseQuantity } = require('../services/inventoryService');
const { logAdminAudit } = require('../services/auditService');
const { sanitizeRichDescription, stripToPlainText } = require('../utils/htmlSanitize');
const { normalizeVariantsForPersistence } = require('../utils/productVariants');
const { applyMissingProductSeo, generateProductSeo } = require('../utils/productSeoGenerator');

const SKIN_TYPE_VALUES = new Set(['hassas', 'kuru', 'yagli_karma', 'olgun', 'tumu']);

/** Müşteriye dönen yanıtlardan gizlenecek alanlar (yalnızca admin görür). */
const PUBLIC_PRODUCT_EXCLUDE = ['barcode'];

/** Cilt tipi gönderildiğinde değeri doğrula; vitrin filtresi artık bölge/amaca bağlı olmadığı için bu alanları nötrle. */
function normalizeProductSkinTypeAndLegacyFilters(data) {
    if (!Object.prototype.hasOwnProperty.call(data, 'skin_type')) return;
    const raw = String(data.skin_type ?? '').trim();
    data.skin_type = SKIN_TYPE_VALUES.has(raw) ? raw : 'tumu';
    data.area = 'genel';
    data.purpose = 'diger';
}

/**
 * Multer/form alanları boş DECIMAL alanları '' gönderir; MySQL DECIMAL '' kabul etmez → NULL olmalı.
 * @param {Record<string, unknown>} data
 */
function normalizeProductOptionalNumbers(data) {
    if (Object.prototype.hasOwnProperty.call(data, 'original_price')) {
        const v = data.original_price;
        if (v === '' || v === undefined || v === null) {
            data.original_price = null;
        } else {
            const n = parseFloat(String(v).replace(',', '.'));
            data.original_price =
                Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : null;
        }
    }

    if (Object.prototype.hasOwnProperty.call(data, 'discountPercent')) {
        const v = data.discountPercent;
        if (v === '' || v === undefined || v === null) {
            data.discountPercent = null;
        } else {
            const i = parseInt(String(v), 10);
            data.discountPercent = Number.isFinite(i) && i >= 0 ? i : null;
        }
    }

    for (const key of ['discountStartsAt', 'discountExpiresAt']) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
        if (data[key] === '' || data[key] === undefined) {
            data[key] = null;
        }
    }
}

/** @param {Record<string, unknown>} data */
function applyProductTextAndVariantsSanitize(data) {
    if (Object.prototype.hasOwnProperty.call(data, 'description')) {
        data.description = sanitizeRichDescription(
            typeof data.description === 'string' ? data.description : String(data.description ?? ''),
        );
    }
    if (Object.prototype.hasOwnProperty.call(data, 'meta_description') && data.meta_description != null) {
        data.meta_description = stripToPlainText(data.meta_description);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'meta_title') && data.meta_title != null) {
        data.meta_title = stripToPlainText(data.meta_title).slice(0, 255);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'slug') && data.slug != null) {
        data.slug = stripToPlainText(data.slug).replace(/\s+/g, '-').slice(0, 220);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'barcode')) {
        const b = stripToPlainText(String(data.barcode ?? '')).trim().slice(0, 64);
        data.barcode = b || null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'variants')) {
        const v = Array.isArray(data.variants) ? data.variants : [];
        data.variants = normalizeVariantsForPersistence(v);
    }
}

/**
 * Çakışan slug'ları sırayla `-2`, `-3` … ile düzeltir.
 * `excludeId`: güncellenen kayıttaki mevcut slug aynı üründe ise değiştirmeden döner.
 * @param {typeof Product} ProductModel
 * @param {string | null | undefined} baseSlug
 * @param {string | null | undefined} excludeId
 */
async function allocateUniqueProductSlug(ProductModel, baseSlug, excludeId) {
    const clean =
        stripToPlainText(String(baseSlug || ''))
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 220) || null;
    if (!clean) return null;

    let candidate = clean;
    let n = 0;
    for (;;) {
        const existing = await ProductModel.findOne({
            where: { slug: candidate },
            paranoid: true,
        });
        const isSelf =
            existing &&
            excludeId &&
            String(existing.id) === String(excludeId);
        if (!existing || isSelf) return candidate.toLowerCase();

        n += 1;
        const suffix = `-${n}`;
        candidate = `${clean.slice(0, Math.max(1, 220 - suffix.length)).replace(/-+$/, '')}${suffix}`
            .replace(/-+/g, '-')
            .slice(0, 220);

        if (n > 5000) {
            return `${clean.slice(0, 172)}-${Date.now().toString(36)}`.slice(0, 220).toLowerCase();
        }
    }
}

// Admin panel — SEO önizleme / form doldurma
exports.generateSeoPreview = async (req, res) => {
    try {
        const { name, brand, category, description, excludeProductId } = req.body || {};
        const n = stripToPlainText(typeof name === 'string' ? name : '');
        if (!n.trim()) {
            return res.status(400).json({ status: 'fail', message: 'SEO üretmek için ürün adı gerekli.' });
        }

        const pack = generateProductSeo({
            name,
            brand,
            category,
            description:
                typeof description === 'string' ? description : String(description ?? ''),
        });

        let slugSuggestion = await allocateUniqueProductSlug(
            Product,
            pack.slug,
            excludeProductId || null,
        );

        res.status(200).json({
            status: 'success',
            data: {
                slug: slugSuggestion || pack.slug || '',
                meta_title: pack.meta_title,
                meta_description: pack.meta_description,
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 1. TÜM ÜRÜNLERİ GETİR — opsiyonel: ?tag=cok-satan&limit=8 (vitrin «çok satan» vb.)
exports.getAllProducts = async (req, res) => {
    try {
        const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';
        const limitRaw = parseInt(String(req.query.limit || ''), 10);
        const limit =
            Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 48) : null;

        const where = { is_active: true };
        if (tag) {
            where.tag = tag;
        }

        const products = await Product.findAll({
            where,
            attributes: { exclude: PUBLIC_PRODUCT_EXCLUDE },
            order: [['createdAt', 'DESC']],
            ...(limit ? { limit } : {}),
        });

        res.status(200).json({
            status: 'success',
            data: { products },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** Tüm kayıtlı ürünler (pasif dahil) — yalnızca admin panel */
exports.getAllProductsAdmin = async (req, res) => {
    try {
        const products = await Product.findAll({
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: { products },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 2. TEK BİR ÜRÜNÜ DETAYLI GETİR
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            attributes: { exclude: PUBLIC_PRODUCT_EXCLUDE },
        });
        
        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Aradığınız ürün bulunamadı.' });
        }
        
        res.status(200).json({ status: 'success', data: { product } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/**
 * Frontend'in gönderdiği kesin görsel sırasını uygular.
 * `imageOrder` jeton dizisi: "existing:<url>" mevcut görsel, "new:<index>" yeni yüklenen dosya.
 * @param {string} raw  imageOrder JSON metni
 * @param {string[]} existingAllowed  korunmasına izin verilen mevcut url'ler
 * @param {string[]} uploaded  yeni yüklenen dosya yolları (req.files sırası)
 * @returns {string[] | null}  çözümlenmiş sıralı liste veya geçersizse null
 */
function resolveImageOrder(raw, existingAllowed, uploaded) {
    let order;
    try {
        order = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!Array.isArray(order)) return null;
    const allow = new Set(existingAllowed);
    const usedUploads = new Set();
    const out = [];
    for (const tok of order) {
        if (typeof tok !== 'string') continue;
        if (tok.startsWith('new:')) {
            const i = parseInt(tok.slice(4), 10);
            if (Number.isInteger(i) && uploaded[i] && !usedUploads.has(i)) {
                out.push(uploaded[i]);
                usedUploads.add(i);
            }
        } else if (tok.startsWith('existing:')) {
            const u = tok.slice('existing:'.length);
            if (allow.has(u) && !out.includes(u)) out.push(u);
        }
    }
    // Sırada referans verilmeyen yeni dosyaları kaybetme — sona ekle
    uploaded.forEach((u, i) => {
        if (!usedUploads.has(i)) out.push(u);
    });
    return out.slice(0, 5);
}

// 2. YENİ ÜRÜN EKLE
exports.createProduct = async (req, res) => {
    try {
        // Form verilerini al
        const productData = { ...req.body };

        // Çoklu resim dosyalarını yakala ve diziye çevir
        const uploaded = (req.files && req.files.length > 0)
            ? req.files.map((file) => `/uploads/${file.filename}`)
            : [];
        if (req.body.imageOrder) {
            const ordered = resolveImageOrder(req.body.imageOrder, [], uploaded);
            productData.images = (ordered && ordered.length) ? ordered : uploaded;
        } else {
            productData.images = uploaded;
        }
        delete productData.imageOrder;

        // Frontend'den gelen varyant verisini JSON'a çevir
        if (req.body.variants) {
            try {
                productData.variants = JSON.parse(req.body.variants);
            } catch (error) {
                productData.variants = [];
            }
        }

        applyMissingProductSeo(productData);
        applyProductTextAndVariantsSanitize(productData);
        normalizeProductSkinTypeAndLegacyFilters(productData);
        normalizeProductOptionalNumbers(productData);

        const slugAfter = String(productData.slug || '').trim();
        if (slugAfter) {
            const unique = await allocateUniqueProductSlug(Product, slugAfter, null);
            if (unique) productData.slug = unique;
        }

        const newProduct = await Product.create(productData);
        await setMainWarehouseQuantity(newProduct.id, Number(newProduct.stock) || 0, null);

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'product.create',
            entityType: 'product',
            entityId: newProduct.id,
            meta: { name: newProduct.name },
        });

        res.status(201).json({ 
            status: 'success', 
            message: 'Ürün başarıyla eklendi!',
            data: { product: newProduct } 
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 3. ÜRÜNÜ GÜNCELLE
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        
        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }
        
        const updateData = { ...req.body };

        delete updateData.existingImages;
        delete updateData.images;
        delete updateData.imageOrder;

        // Mevcut görseller + yeni yüklemeler (en fazla 5)
        const hasExistingField = Object.prototype.hasOwnProperty.call(req.body, 'existingImages');
        const hasOrderField = Object.prototype.hasOwnProperty.call(req.body, 'imageOrder');
        if (hasExistingField || hasOrderField || (req.files && req.files.length > 0)) {
            let imgs = Array.isArray(product.images) ? [...product.images] : [];
            if (hasExistingField && req.body.existingImages) {
                try {
                    const parsed = JSON.parse(req.body.existingImages);
                    if (Array.isArray(parsed)) {
                        imgs = parsed.filter((x) => typeof x === 'string' && x.trim());
                    }
                } catch {
                    imgs = [];
                }
            }
            const uploaded = (req.files && req.files.length > 0)
                ? req.files.map((file) => `/uploads/${file.filename}`)
                : [];
            if (hasOrderField && req.body.imageOrder) {
                // Kesin sıra: hem mevcutları hem yenileri istenen düzende yerleştir
                const ordered = resolveImageOrder(req.body.imageOrder, imgs, uploaded);
                imgs = ordered || imgs.concat(uploaded);
            } else if (uploaded.length) {
                imgs = imgs.concat(uploaded);
            }
            updateData.images = imgs.slice(0, 5);
        }

        // Frontend'den gelen varyant verisini JSON'a çevir
        if (req.body.variants) {
            try {
                updateData.variants = JSON.parse(req.body.variants);
            } catch (error) {
                updateData.variants = [];
            }
        }

        applyMissingProductSeo(updateData);
        applyProductTextAndVariantsSanitize(updateData);
        normalizeProductSkinTypeAndLegacyFilters(updateData);
        normalizeProductOptionalNumbers(updateData);

        if (
            Object.prototype.hasOwnProperty.call(updateData, 'slug') &&
            updateData.slug != null &&
            String(updateData.slug).trim()
        ) {
            const uniq = await allocateUniqueProductSlug(
                Product,
                String(updateData.slug).trim(),
                product.id,
            );
            if (uniq) updateData.slug = uniq;
        }

        const prevStock = Number(product.stock) || 0;

        await product.update(updateData);
        if (updateData.stock !== undefined) {
            await setMainWarehouseQuantity(product.id, Number(updateData.stock), null);
        }

        await product.reload();
        const newStock = Number(product.stock) || 0;
        if (prevStock < 1 && newStock >= 1 && product.is_active !== false) {
            const { notifyStockRestock } = require('../services/productStockAlerts');
            setImmediate(() =>
                notifyStockRestock(product).catch((err) =>
                    console.error('[stock-alert]', err.message || err),
                ),
            );
        }

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'product.update',
            entityType: 'product',
            entityId: product.id,
            meta: {
                keys: Object.keys(updateData || {}).slice(0, 25),
            },
        });

        res.status(200).json({ 
            status: 'success', 
            message: 'Ürün güncellendi!', 
            data: { product } 
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 4b. Vitrin görünürlüğü (JSON PATCH)
exports.patchProductVisibility = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                status: 'fail',
                message: 'is_active alanı true veya false olmalıdır.',
            });
        }
        // Admin elle değiştirdiyse "otomatik gizlendi" bayrağını temizle ki
        // stok hareketi bu manuel kararı ezmesin.
        await product.update({ is_active, autoHiddenOutOfStock: false });
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'product.visibility',
            entityType: 'product',
            entityId: product.id,
            meta: { is_active },
        });
        res.status(200).json({
            status: 'success',
            message: 'Ürün durumu güncellendi.',
            data: { product },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 5. ÜRÜNÜ SİL / PASİFE AL (SADECE ADMİN)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        
        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Silinecek ürün bulunamadı.' });
        }

        await product.update({ is_active: false });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'product.deactivate',
            entityType: 'product',
            entityId: product.id,
            meta: { name: product.name },
        });

        res.status(200).json({ status: 'success', message: 'Ürün başarıyla mağazadan kaldırıldı.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** İstek gövdesinden tarih okur (ISO veya tarih-metin); boş ise null döner */
function bulkParseNullableDate(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
}

// 6. TOPLU İŞLEMLER (ADMİN)
exports.bulkActions = async (req, res) => {
    try {
        const { action, ids, value, startDate, endDate } = req.body;

        if (!ids || ids.length === 0) {
            return res.status(400).json({ status: 'fail', message: 'Lütfen işlem yapılacak ürünleri seçin.' });
        }

        const parsedValue = parseFloat(value);

        // 1. Vitrinden gizle (pasifleştir) — delete adı geriye dönük uyumluluk
        if (action === 'delete' || action === 'deactivate' || action === 'hide') {
            await Product.update({ is_active: false }, { where: { id: ids } });
        }

        // 1b. Vitrine al
        else if (action === 'activate' || action === 'publish') {
            await Product.update({ is_active: true }, { where: { id: ids } });
        }

        // 1c. Arşivle (yumuşak silme — deletedAt; admin listesinde görünmez)
        else if (action === 'purge' || action === 'archive') {
            await Product.destroy({ where: { id: ids } });
        }

        // 2. Toplu yüzde indirim planı — başlangıç/bitis saatli (cron + anlık tarih için sunucuda)
        else if (action === 'price_discount') {
            const pct = parseInt(String(value ?? '').trim(), 10);
            if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
                return res.status(400).json({ status: 'fail', message: 'İndirim %1 ile %99 arasında olmalıdır.' });
            }

            let startAt = bulkParseNullableDate(startDate);
            if (startAt === undefined) {
                return res.status(400).json({ status: 'fail', message: 'Başlangıç tarihi veya saati geçersiz.' });
            }
            const endAt = bulkParseNullableDate(endDate);

            if (startAt === null) {
                startAt = new Date();
            }
            if (endAt === undefined && endDate) {
                return res.status(400).json({ status: 'fail', message: 'Bitiş tarihi veya saati geçersiz.' });
            }
            if (endAt instanceof Date && endAt <= startAt) {
                return res.status(400).json({ status: 'fail', message: 'İndirim bitiş tarihi başlangıçtan sonra olmalıdır.' });
            }

            const products = await Product.findAll({ where: { id: ids } });

            for (let p of products) {
                const base = parseFloat(p.original_price) > 0 ? parseFloat(p.original_price) : parseFloat(p.price);
                const originalPrice = Number.isFinite(base) && base > 0 ? base : parseFloat(p.price);
                await p.update({
                    original_price: originalPrice.toFixed(2),
                    discountPercent: pct,
                    discountStartsAt: startAt,
                    discountExpiresAt: endAt || null,
                });
            }
        }

        // 2.5 - Toplu indirimi kaldır (kurallı liste fiyatına dön)
        else if (action === 'remove_discount') {
            const products = await Product.findAll({ where: { id: ids } });
            for (const p of products) {
                const orig = parseFloat(p.original_price);
                const revert =
                    Number.isFinite(orig) && orig > 0 ? orig : parseFloat(p.price);
                await p.update({
                    price: revert.toFixed(2),
                    original_price: null,
                    discountPercent: null,
                    discountStartsAt: null,
                    discountExpiresAt: null,
                });
            }
        }

        // 3. Toplu zam (liste tabanlı % — indirim alanları silinir)
        else if (action === 'price_increase') {
            if (isNaN(parsedValue) || parsedValue <= 0) {
                return res.status(400).json({ status: 'fail', message: 'Geçersiz zam değeri.' });
            }

            const products = await Product.findAll({ where: { id: ids } });
            for (const p of products) {
                const currentPrice =
                    parseFloat(p.original_price) > 0 ? parseFloat(p.original_price) : parseFloat(p.price);
                const increaseAmount = (currentPrice * parsedValue) / 100;
                const newPrice = currentPrice + increaseAmount;

                await p.update({
                    price: newPrice.toFixed(2),
                    original_price: null,
                    discountPercent: null,
                    discountStartsAt: null,
                    discountExpiresAt: null,
                });
            }
        }

        // 4. Toplu stok eşitleme
        else if (action === 'stock') {
            if (isNaN(parsedValue) || parsedValue < 0) {
                return res.status(400).json({ status: 'fail', message: 'Geçersiz stok değeri.' });
            }
            await Product.update({ stock: parsedValue }, { where: { id: ids } });
            for (const id of ids) {
                await setMainWarehouseQuantity(id, parsedValue, null);
            }
        }

        // 5. Toplu etiket
        else if (action === 'tag') {
            const tagStr = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
            if (!tagStr) {
                return res.status(400).json({ status: 'fail', message: 'Etiket değeri gerekli.' });
            }
            await Product.update({ tag: tagStr }, { where: { id: ids } });
        } else {
            return res.status(400).json({
                status: 'fail',
                message: `Geçersiz toplu işlem: ${action == null ? '(boş)' : String(action)}`,
            });
        }

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'product.bulk',
            entityType: 'product',
            entityId: null,
            meta: {
                bulkAction: action,
                idCount: ids.length,
                hasValue: value !== undefined && value !== '',
            },
        });

        res.status(200).json({ 
            status: 'success', 
            message: `${ids.length} adet ürün üzerinde işlem başarıyla uygulandı.` 
        });

    } catch (err) {
        console.error("Toplu işlem hatası:", err); // Termianlde net hatayı görmek için
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── CSV İçe Aktarma Yardımcıları ─────────────────────────────────────────

const HEADER_MAP = {
    // normalize edilmiş başlık -> Product alanı
    'marka': 'brand',
    'brand': 'brand',
    'kategori': 'category',
    'kategori ismi': 'category',
    'kategori adi': 'category',
    'category': 'category',
    'urun adi': 'name',
    'urun ismi': 'name',
    'urun': 'name',
    'name': 'name',
    'urun aciklamasi': 'description',
    'aciklama': 'description',
    'description': 'description',
    'piyasa satis fiyati (kdv dahil)': 'price',
    'piyasa satis fiyati': 'price',
    'satis fiyati': 'price',
    'fiyat': 'price',
    'price': 'price',
    'urun stok adedi': 'stock',
    'stok adedi': 'stock',
    'stok': 'stock',
    'stock': 'stock',
};

const norm = (s) =>
    String(s ?? '')
        .replace(/^\uFEFF/, '')
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i').replace(/İ/g, 'i')
        .replace(/ş/g, 's').replace(/ş/g, 's')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, ' ')
        .trim();

const parsePriceTr = (v) => {
    if (v === undefined || v === null) return NaN;
    let s = String(v).trim();
    if (!s) return NaN;
    if (s.includes(',') && s.includes('.')) {
        // "1.299,50" → TR: . binlik, , ondalık
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    s = s.replace(/[^\d.\-]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
};

const parseStockInt = (v) => {
    const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : NaN;
};

const slugify = (s) =>
    String(s || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i').replace(/İ/g, 'i')
        .replace(/ş/g, 's').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

// 7. CSV İLE TOPLU ÜRÜN İÇE AKTAR (SADECE ADMİN)
exports.importProducts = async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ status: 'fail', message: 'CSV dosyası gerekli.' });
    }

    try {
        let raw = req.file.buffer.toString('utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

        // Ayraç otomatik tespiti (Excel "Save As CSV" çoğunlukla ; kullanır)
        const firstLine = raw.split(/\r?\n/, 1)[0] || '';
        const delimiter =
            (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

        const rows = parse(raw, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
            delimiter,
            relax_column_count: true,
        });

        if (!rows.length) {
            return res.status(400).json({ status: 'fail', message: 'CSV boş görünüyor.' });
        }

        // Başlık eşleştirme: ilk satırın anahtarlarını Product alanlarına bağla
        const sampleKeys = Object.keys(rows[0]);
        const keyMap = {};
        for (const k of sampleKeys) {
            const target = HEADER_MAP[norm(k)];
            if (target) keyMap[k] = target;
        }

        const requiredFields = ['name', 'description', 'price'];
        const missing = requiredFields.filter((f) => !Object.values(keyMap).includes(f));
        if (missing.length) {
            return res.status(400).json({
                status: 'fail',
                message:
                    'CSV başlıklarında eksik sütun var: ' +
                    missing
                        .map((f) =>
                            f === 'name'
                                ? '"Ürün Adı"'
                                : f === 'description'
                                ? '"Ürün Açıklaması"'
                                : '"Piyasa Satış Fiyatı (KDV Dahil)"'
                        )
                        .join(', '),
            });
        }

        const skipped = [];
        const created = [];

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const rec = {};
            for (const [k, t] of Object.entries(keyMap)) {
                rec[t] = r[k];
            }

            const name = String(rec.name || '').trim();
            const description = String(rec.description || '').trim();
            const price = parsePriceTr(rec.price);
            const stockRaw = parseStockInt(rec.stock);
            const brand = rec.brand ? String(rec.brand).trim() : null;
            const category = rec.category ? String(rec.category).trim() : null;

            if (!name) {
                skipped.push({ row: i + 2, reason: 'Ürün Adı boş' });
                continue;
            }
            if (name.length < 2 || name.length > 150) {
                skipped.push({ row: i + 2, reason: 'Ürün Adı uzunluğu 2-150 karakter olmalı' });
                continue;
            }
            if (!description) {
                skipped.push({ row: i + 2, reason: 'Ürün Açıklaması boş' });
                continue;
            }
            if (!Number.isFinite(price) || price < 0) {
                skipped.push({ row: i + 2, reason: 'Fiyat geçersiz' });
                continue;
            }
            const stock = Number.isFinite(stockRaw) && stockRaw >= 0 ? stockRaw : 0;

            try {
                const safeDesc = sanitizeRichDescription(description);
                const seoPack = generateProductSeo({
                    name,
                    brand: brand || '',
                    category: category || '',
                    description: safeDesc,
                });
                const baseSlug = seoPack.slug || slugify(name);
                let finalSlug =
                    (await allocateUniqueProductSlug(Product, baseSlug, null)) ||
                    `${slugify(name)}-${Date.now().toString(36)}-${(i + 1).toString(36)}`;

                const created_p = await Product.create({
                    name,
                    description: safeDesc,
                    price: price.toFixed(2),
                    stock,
                    brand,
                    category,
                    slug: finalSlug,
                    meta_title: seoPack.meta_title,
                    meta_description: seoPack.meta_description,
                    skin_type: 'tumu',
                    area: 'genel',
                    purpose: 'diger',
                    tag: 'yok',
                    variants: [],
                    images: [],
                    is_active: true,
                });
                created.push(created_p.id);
                await setMainWarehouseQuantity(created_p.id, stock, null);
            } catch (e) {
                skipped.push({ row: i + 2, reason: e.message });
            }
        }

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'product.import_csv',
            entityType: 'product',
            entityId: null,
            meta: {
                createdCount: created.length,
                skippedCount: skipped.length,
                totalRows: rows.length,
            },
        });

        return res.status(200).json({
            status: 'success',
            message: `${created.length} ürün eklendi, ${skipped.length} satır atlandı.`,
            data: {
                totalRows: rows.length,
                createdCount: created.length,
                skippedCount: skipped.length,
                skipped: skipped.slice(0, 200), // gerektiğinde sınırla
            },
        });
    } catch (err) {
        return res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Slug ile ürün getir (SEO Uyumlu)
exports.getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ 
            where: { slug: req.params.slug, is_active: true },
            attributes: { exclude: PUBLIC_PRODUCT_EXCLUDE },
        });
        
        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }
        
        res.status(200).json({ status: 'success', data: { product } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** Vitrin — yalnızca aktif ürün, UUID ile (slug yoksa link için) */
exports.getPublicProductById = async (req, res) => {
    try {
        const product = await Product.findOne({
            where: { id: req.params.id, is_active: true },
            attributes: { exclude: PUBLIC_PRODUCT_EXCLUDE },
        });

        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }

        res.status(200).json({ status: 'success', data: { product } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};