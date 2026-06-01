const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            notEmpty: true, // Boş bırakılamaz
            len: [2, 150]
        }
    },
    brand: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2), // Kuruşlu fiyatlar için DECIMAL kullanılır
        allowNull: false,
        validate: { min: 0 } // Eksi fiyata ürün eklenmesini engeller
    },
    original_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    // YENİ EKLENEN KISIM: İNDİRİM BAŞLANGIÇ
    discountStartsAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // DÜZELTİLEN KISIM: İNDİRİM BİTİŞ
    discountExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    discountPercent: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },  
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    },
    area: {
        type: DataTypes.ENUM('yuz', 'vucut', 'goz', 'el', 'genel'),
        defaultValue: 'genel'
    },
    purpose: {
        type: DataTypes.ENUM('temizleyici', 'nemlendirici', 'anti-aging', 'onarici', 'diger'),
        defaultValue: 'diger'
    },
    /** Mağaza “cilt tipi” filtresi (bölge/amacı kullanıcı tarafından doldurmaz). */
    skin_type: {
        type: DataTypes.ENUM('hassas', 'kuru', 'yagli_karma', 'olgun', 'tumu'),
        allowNull: false,
        defaultValue: 'tumu',
    },
    tag: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'yok'
    },
    variants: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: true
    },
    meta_title: {
        type: DataTypes.STRING,
        allowNull: true
    },
    meta_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Product.js içindeki tanımlamalara ekle/değiştir:
    images: {
        type: DataTypes.JSON, // Resim yollarını ["/uploads/resim1.jpg", "/uploads/resim2.jpg"] şeklinde tutacak
        allowNull: true,
        defaultValue: []
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Admin panelinden ürünü silmeden gizlemek için
    },
    /** KDV oranı (yüzde). Boş bırakılırsa muhasebe yazılımı varsayılanı uygulanır. */
    vatRate: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 0, max: 100 },
    },
}, {
    tableName: 'products',
    timestamps: true,
    paranoid: true // Ürün silindiğinde tamamen yok etmez, sadece deletedAt sütununa tarih atar (Soft Delete)
});

module.exports = Product;