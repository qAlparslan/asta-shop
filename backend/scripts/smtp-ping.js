/**
 * SMTP bağlantı ve kimlik doğrulama testi (mail göndermez).
 * Kullanım: node scripts/smtp-ping.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const nodemailer = require('nodemailer');

function envStripQuotes(value) {
    const s = String(value ?? '').trim();
    if (
        (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
        (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
    ) {
        return s.slice(1, -1);
    }
    return s;
}

async function main() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const user = envStripQuotes(process.env.SMTP_USER);
    const pass = envStripQuotes(process.env.SMTP_PASS);
    const rawPass = String(process.env.SMTP_PASS ?? '');

    console.log('SMTP_HOST:', host || '(yok)');
    console.log('SMTP_PORT:', port, 'secure:', secure);
    console.log('SMTP_USER:', user || '(yok)');
    console.log('SMTP_PASS uzunluk:', pass.length, rawPass.includes('#') ? '(ham satırda # var)' : '');

    if (!host || !user || !pass) {
        console.error('Eksik SMTP ayarı.');
        process.exit(1);
    }

    if (pass.length < 6 && rawPass.includes('#')) {
        console.error('');
        console.error('Muhtemel sorun: .env içinde SMTP_PASS=cv#... yazıldıysa dotenv şifreyi "#" öncesinde keser.');
        console.error('Düzeltme: SMTP_PASS="tam_sifreniz"  (çift tırnak içinde)');
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    try {
        await transporter.verify();
        console.log('OK — SMTP verify başarılı (kimlik doğrulama geçti).');
        process.exit(0);
    } catch (err) {
        console.error('HATA — SMTP verify:', err.message);
        if (/535|authentication failed/i.test(String(err.message))) {
            console.error('');
            console.error('535 = kullanıcı adı veya şifre yanlış (veya .env\'de şifre kesilmiş).');
            console.error('Paneldeki posta kutusu şifresi ile SMTP_PASS aynı olmalı; # içeriyorsa tırnak şart.');
            console.error('Alternatif: port 587 + SMTP_SECURE=false (STARTTLS) deneyin.');
        }
        process.exit(1);
    }
}

main();
