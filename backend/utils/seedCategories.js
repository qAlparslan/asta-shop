const Category = require('../models/Category');

const DEFAULT_CATEGORIES = [
    'Vücut Kremi',
    'Makyaj Temizleyici',
    'El Kremi',
    'Mum & Kandil',
    'Koku Önleyici',
    'Cilt Bakım Seti',
    'Cilt Serumu',
    'Yüz Peelingi',
    'Vücut Güneş Kremi',
    'Yüz Güneş Kremi',
    'Katı Sabun',
    'Şampuan',
    'Dudak Kremi ve Peelingi',
    'Göz Kremi',
    'Tırnak Bakım',
    'Göz Serumu',
    'Güneş Sonrası Ürünü',
    'Yüz Kremi',
    'Yüz Temizleyici',
];

const TR_TO_ASCII = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' };

const slugify = (s) =>
    String(s || '')
        .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (ch) => TR_TO_ASCII[ch] || ch)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);

async function seedCategories() {
    const count = await Category.count();
    if (count > 0) return;

    console.log('🌱 categories tablosu boş — varsayılan 19 kategori ekleniyor…');
    const usedSlugs = new Set();
    const rows = DEFAULT_CATEGORIES.map((name, i) => {
        let slug = slugify(name) || `kategori-${i + 1}`;
        let s = slug;
        let n = 2;
        while (usedSlugs.has(s)) s = `${slug}-${n++}`;
        usedSlugs.add(s);
        return { name, slug: s, displayOrder: i + 1, isActive: true };
    });

    await Category.bulkCreate(rows, { ignoreDuplicates: true });
    console.log(`✅ ${rows.length} kategori oluşturuldu.`);
}

module.exports = seedCategories;
