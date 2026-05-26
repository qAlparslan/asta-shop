/**
 * Sunucuda çalıştırın: node scripts/verify-html-sanitize.js
 * Yanlış (eski) isomorphic-dompurify kurulumunu yakalar.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sanitizePath = path.join(root, 'utils', 'htmlSanitize.js');
const pkgPath = path.join(root, 'package.json');

function fail(msg) {
    console.error('❌', msg);
    process.exit(1);
}

if (!fs.existsSync(sanitizePath)) fail(`Dosya yok: ${sanitizePath}`);

const src = fs.readFileSync(sanitizePath, 'utf8');
if (/isomorphic-dompurify/i.test(src)) {
    fail('utils/htmlSanitize.js hâlâ isomorphic-dompurify kullanıyor. Yerel projeden güncel dosyayı yükleyin.');
}
if (!/sanitize-html/.test(src) || !/require\s*\(\s*['"]sanitize-html['"]\s*\)/.test(src)) {
    fail('utils/htmlSanitize.js içinde sanitize-html require() bulunamadı.');
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
if (deps['isomorphic-dompurify']) {
    fail('package.json içinde isomorphic-dompurify hâlâ var. Yerel güncel package.json kullanın.');
}
if (!deps['sanitize-html']) {
    fail('package.json içinde sanitize-html eksik.');
}

console.log('✅ htmlSanitize + package.json doğru görünüyor.');
process.exit(0);
