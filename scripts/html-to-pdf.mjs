import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const htmlPath = join(root, 'docs', 'ASTA-Ticaret-Site-Kullanim-Kilavuzu.html');
const pdfPath = join(root, 'docs', 'ASTA-Ticaret-Site-Kullanim-Kilavuzu.pdf');

const html = readFileSync(htmlPath, 'utf8');

let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch {
  console.error('puppeteer yok — npx puppeteer kuruluyor denenebilir');
  process.exit(1);
}

const browser = await puppeteer.default.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
});
await browser.close();
console.log('PDF oluşturuldu:', pdfPath);
