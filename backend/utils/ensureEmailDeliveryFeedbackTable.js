const sequelize = require('../config/database');

async function ensureEmailDeliveryFeedbackTable() {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS email_delivery_feedback (
            id CHAR(36) BINARY NOT NULL PRIMARY KEY,
            recipientEmail VARCHAR(320) NOT NULL,
            kind VARCHAR(40) NOT NULL,
            provider VARCHAR(40) NULL,
            diagnosticCode VARCHAR(120) NULL,
            message TEXT NULL,
            notificationId VARCHAR(200) NULL,
            rawPayload JSON NULL,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX email_delivery_feedback_recipient_idx (recipientEmail),
            INDEX email_delivery_feedback_kind_idx (kind),
            INDEX email_delivery_feedback_created_idx (createdAt)
        )
    `).catch((err) => {
        console.warn('   ⚠️ email_delivery_feedback tablosu:', err.message);
    });
}

module.exports = ensureEmailDeliveryFeedbackTable;
