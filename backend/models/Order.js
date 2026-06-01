const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    // YENİ: Kargo için telefon ve adres zorunlu
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    items: {
        type: DataTypes.JSON,
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    /** Checkout sırasında uygulanan kupon (ödeme sepeti eşlemesi + rapor). */
    couponCode: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('odeme_bekleniyor', 'hazirlaniyor', 'kargolandi', 'teslim-edildi', 'iptal-edildi'),
        defaultValue: 'hazirlaniyor'
    },
    // Kargo takip numarası (admin manuel girer)
    trackingNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    /** Opsiyonel kargo firma adı (varsayılan boş — admin elle yönetir) */
    carrier: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
    },
    shippedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    /** Müşteri e-fatura / e-arşiv talebi (firma seçimi entegrasyonda yapılabilir) */
    wantsElectronicInvoice: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    /** VKN 10 veya TCKN 11 hane (sadece rakam) */
    invoiceTaxNumber: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    /** Kurumsal unvan veya bireyselde fatura adı */
    invoiceCompanyTitle: {
        type: DataTypes.STRING(254),
        allowNull: true,
    },
    /** VKN için zorunlu; TCKN’de opsiyonel */
    invoiceTaxOffice: {
        type: DataTypes.STRING(160),
        allowNull: true,
    },
    /** none | awaiting_integration | submitted | pending_manual | failed */
    eInvoiceStatus: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'none',
    },
    eInvoiceIntegrationRef: {
        type: DataTypes.STRING(160),
        allowNull: true,
    },
    eInvoiceLastError: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'orders',
    timestamps: true
});

module.exports = Order;