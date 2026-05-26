const baseLayout = require('./baseLayout');
const { escapeHtml } = require('./_utils');
const T = require('./emailTheme');

module.exports = function passwordResetTemplate({ fullName, resetUrl, storeName, logoUrl }) {
    const firstName = String(fullName || '').split(' ')[0] || 'değerli müşterimiz';
    const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Güvenlik
    </p>
    <h2 style="${T.heading}">
      Şifre sıfırlama
    </h2>
    <p style="${T.bodyText}">
      Merhaba ${escapeHtml(firstName)},<br><br>
      Hesabınız için bir şifre sıfırlama isteği aldık. Aşağıdaki düğmeyle güvenli biçimde yeni şifre oluşturabilirsiniz.
      Güvenlik için bu bağlantı <strong style="color:${T.navy};">30 dakika</strong> sonra geçersiz olur.
    </p>
    <p style="text-align:center;margin:36px 0;">
      <a href="${escapeHtml(resetUrl)}"
         style="${T.btnPrimary}">
        Yeni şifre belirle
      </a>
    </p>
    <div style="${T.cardNeutral}">
      <p style="${T.mutedText} margin:0;">
        Bu isteği siz oluşturmadıysanız bu e-postayı yok sayın; şifreniz değişmez.<br><br>
        <strong style="color:${T.navy};font-size:12px;">Çalışmıyorsa</strong> şu adresi tarayıcıya yapıştırın:
      </p>
      <p style="margin:10px 0 0;font-size:11px;line-height:1.55;color:${T.textMuted};word-break:break-all;font-family:${T.fontMono};">
        ${escapeHtml(resetUrl)}
      </p>
    </div>
  `;
    return {
        subject: `${storeName} — Şifre sıfırlama`,
        html: baseLayout({ title: 'Şifre sıfırlama', content, storeName, logoUrl }),
    };
};
