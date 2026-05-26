import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

const ordered = [
  ['text-app-muted/80', 'text-gray-400'],
  ['text-app-muted/90', 'text-gray-400'],
  ['bg-app-surface-muted', 'bg-soft'],
  ['bg-app-footer', 'bg-gray-900'],
  ['text-app-footer-heading', 'text-white'],
  ['text-app-footer-text', 'text-gray-400'],
  ['divide-app-border', 'divide-gray-100'],
  ['border-app-border', 'border-gray-100'],
  ['bg-app-surface', 'bg-white'],
  ['via-app-page', 'via-white'],
  ['dark:via-app-page', ''],
  ['hover:bg-app-surface-muted', 'hover:bg-cream'],
  ['hover:bg-app-page', 'hover:bg-cream'],
  ['active:bg-app-page', 'active:bg-cream'],
  ['hover:bg-app-surface', 'hover:bg-white'],
  ['bg-app-input', 'bg-cream'],
  ['bg-app-page', 'bg-cream'],
  ['text-app-text', 'text-gray-900'],
  ['text-app-muted', 'text-gray-600'],
  ['text-app-border', 'text-gray-300'],
];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx|js|tsx|ts|css)$/.test(e.name)) patchFile(p);
  }
}

function patchFile(file) {
  let t = fs.readFileSync(file, 'utf8');
  const orig = t;
  for (const [a, b] of ordered) {
    if (t.includes(a)) t = t.split(a).join(b);
  }
  if (t !== orig) fs.writeFileSync(file, t);
}

walk(srcRoot);
console.log('done');
