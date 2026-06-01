/**
 * Sipariş mail şablonlarını test eder (gerçek SMTP ile gönderir).
 * Kullanım:
 *   node scripts/test-order-email.js onay test@ornek.com
 *   node scripts/test-order-email.js kargo test@ornek.com
 *   node scripts/test-order-email.js admin
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
    sendOrderConfirmationEmail,
    sendAdminNewOrderEmail,
    sendOrderStatusUpdateEmail,
} = require('../services/orderEmailService');

const sampleOrder = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    fullName: 'Test Müşteri',
    email: process.argv[3] || process.env.ADMIN_NOTIFICATION_EMAIL || 'test@example.com',
    phone: '0532 000 00 00',
    address: 'Örnek Mah. Test Sk. No:1 Kadıköy / İstanbul',
    totalAmount: 499.9,
    status: 'hazirlaniyor',
    couponCode: 'TEST10',
    trackingNumber: '1234567890',
    carrier: null,
    items: JSON.stringify([
        { name: 'Örnek Ürün A', quantity: 2, price: 149.95 },
        { name: 'Örnek Ürün B', quantity: 1, price: 200 },
    ]),
};

async function main() {
    const mode = (process.argv[2] || 'onay').toLowerCase();
    let result;
    if (mode === 'admin') {
        result = await sendAdminNewOrderEmail({ ...sampleOrder, status: 'hazirlaniyor' });
    } else if (mode === 'kargo' || mode === 'kargolandi') {
        result = await sendOrderStatusUpdateEmail(
            { ...sampleOrder, status: 'kargolandi' },
            'kargolandi',
        );
    } else if (mode === 'teslim') {
        result = await sendOrderStatusUpdateEmail(
            { ...sampleOrder, status: 'teslim-edildi' },
            'teslim-edildi',
        );
    } else {
        result = await sendOrderConfirmationEmail(sampleOrder);
    }
    console.log(result);
    process.exit(result?.success ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
