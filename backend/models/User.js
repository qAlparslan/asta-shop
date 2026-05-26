const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID, // 1, 2, 3 yerine karmaşık bir ID üretir (Güvenlik için)
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'customer'),
        defaultValue: 'customer' // Varsayılan olarak herkes müşteri kaydedilir
    },
    marketingConsent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    /** Kampanya/teklif (hesap kampanya kitle seçimleri için) — null ise `marketingConsent` geriye uyum */
    emailConsentOffers: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null,
    },
    /** Footer bülten / bilgilendirici liste — null ise geriye uyum */
    emailConsentNewsletter: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null,
    },
    marketingConsentAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    resetPasswordToken: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    resetPasswordExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    unsubscribeToken: {
        // Marketing maillerinde tek tıkla abonelikten çıkma linki için
        type: DataTypes.STRING(64),
        allowNull: true,
    },
}, {
    tableName: 'users',
    indexes: [{ unique: true, name: 'users_email_unique', fields: ['email'] }],
    timestamps: true,
    hooks: {
        // Şifreyi veritabanına GİRMEDEN HEMEN ÖNCE şifreler (Hash)
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Giriş yaparken şifrenin doğru olup olmadığını kontrol edecek fonksiyon
User.prototype.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;