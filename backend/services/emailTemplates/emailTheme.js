/**
 * Frontend (tailwind.config.js) ile aynı palet — tüm transactional / pazarlama maillerinde tek kaynak.
 * @see ../../../tailwind.config.js — brand (#9f2133), asta.navy (#1a2332), gold, fonts
 */
module.exports = {
    navy: '#1a2332',
    brand: '#9f2133',
    brandHover: '#861c2c',
    brandMuted: '#fdf2f2',
    gold: '#c5a065',
    goldSoft: '#d9c49a',
    mutedBar: '#ececee',

    text: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    textFaint: '#9ca3af',
    border: '#e5e7eb',
    surface: '#ffffff',
    surfaceSoft: '#f9fafb',
    pageBg: '#f4f5f7',

    success: '#15803d',
    danger: '#b91c1c',
    warning: '#c2410c',

    /** Inter — body; Gmail iyi destekler, webfont ile birlikte kullanılıyor */
    fontSans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    /** Playfair Display — vitrin başlıkları */
    fontDisplay: "'Playfair Display',Georgia,'Times New Roman',serif",
    /** Sipariş no vb. */
    fontMono: "ui-monospace,'SF Mono',Consolas,Monaco,monospace",

    /** Navbar hissi: ince lacivert + ana bordo şerit */
    stripNavy: 'background:#1a2332;height:3px;line-height:3px;font-size:0;mso-line-height-rule:exactly;',
    stripBrand: 'background:#9f2133;height:4px;line-height:4px;font-size:0;mso-line-height-rule:exactly;',

    /** Ana başlık (h2) — giriş / şifre / sipariş */
    heading:
        'margin:0 0 8px;font-size:26px;line-height:1.25;color:#1a2332;font-weight:700;font-family:' +
        "'Playfair Display',Georgia,'Times New Roman',serif;letter-spacing:-0.025em;",
    /** Alt satır başlığı (ör. sipariş sonrası isim selamı) */
    headingLead:
        'margin:18px 0 12px;font-size:22px;line-height:1.3;color:#1a2332;font-weight:600;font-family:' +
        "'Playfair Display',Georgia,serif;",
    /** Küçük bölüm başlığı (kart içi etiket) */
    labelUpper:
        'margin:0 0 10px;font-size:10px;color:#9f2133;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;font-family:' +
        "'Inter',-apple-system,sans-serif;",

    bodyText:
        'margin:0 0 16px;font-size:15px;line-height:1.75;color:#4b5563;font-family:' +
        "'Inter',-apple-system,sans-serif;",
    mutedText:
        'margin:0;font-size:13px;line-height:1.65;color:#6b7280;font-family:' + "'Inter',-apple-system,sans-serif;",

    /** Birincil CTA — sitedeki rounded dolu düğme */
    btnPrimary:
        'display:inline-block;padding:14px 34px;background:#9f2133;color:#ffffff !important;text-decoration:none;border-radius:9999px;font-weight:600;font-size:15px;letter-spacing:0.015em;mso-padding-alt:0;font-family:' +
        "'Inter',-apple-system,sans-serif;",
    /** İkincil / admin aksiyonu */
    btnNavy:
        'display:inline-block;padding:13px 30px;background:#1a2332;color:#ffffff !important;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;font-family:' +
        "'Inter',-apple-system,sans-serif;",

    /** Yumuşak kutu — adres, uyarı özeti */
    cardSoft:
        'background:#fdf2f2;border:1px solid rgba(159,33,51,0.12);border-radius:14px;padding:20px 22px;',
    cardNeutral:
        'background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;',

    tableHeader:
        'background:#fdf2f2;border-bottom:1px solid #e5e7eb;font-family:' + "'Inter',-apple-system,sans-serif;",

    link: 'color:#9f2133;text-decoration:none;font-weight:600;',
    linkUnderline: 'color:#9f2133;text-decoration:underline;font-weight:600;',

    /** Alt bilgi ile gövde arası — ince altın çizgi (hakkımızda vitrine gönderim) */
    footerAccentLine: 'border-top:2px solid #c5a065;',
};
