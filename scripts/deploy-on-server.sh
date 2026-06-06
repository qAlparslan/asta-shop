#!/usr/bin/env bash
# Sunucuda (aaPanel terminal): proje kökünden çalıştırın
#   cd /www/wwwroot/astaticaret.com && bash scripts/deploy-on-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# aaPanel Node — sürümünüz farklıysa düzenleyin
if [[ -d /www/server/nodejs/v20.15.0/bin ]]; then
    export PATH="/www/server/nodejs/v20.15.0/bin:${PATH:-}"
fi

echo "==> git pull"
git pull --ff-only

if [[ ! -f backend/.env ]]; then
    echo "HATA: backend/.env yok — sunucuya elle kopyalamadan deploy edilemez."
    exit 1
fi

echo "==> frontend bağımlılıklar"
npm install --no-audit --no-fund

echo "==> frontend build (dist/)"
# aaPanel dist/.user.ini güvenlik dosyasını korur; immutable ise rm -rf takılır.
if [[ -d dist ]]; then
    chattr -i dist/.user.ini 2>/dev/null || true
    find dist -mindepth 1 -not -name '.user.ini' -exec rm -rf {} + 2>/dev/null || true
fi
npm run build

if [[ ! -f dist/index.html ]]; then
    echo "HATA: dist/index.html üretilmedi — build başarısız."
    exit 1
fi
echo "    dist/index.html OK"

echo "==> backend bağımlılıklar"
cd backend
npm install --production --no-audit --no-fund
cd "$ROOT"

echo "==> pm2 restart"
if ! command -v pm2 >/dev/null 2>&1; then
    echo "HATA: pm2 PATH'te yok. Şunu deneyin:"
    echo '  export PATH="/www/server/nodejs/v20.15.0/bin:$PATH"'
    exit 1
fi
# Çalışan süreç adı (gerçek kurulumda: asta-backend). Gerekirse PM2_APP ile geçici değiştir.
PM2_APP="${PM2_APP:-asta-backend}"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP" --update-env
else
    pm2 start server.js --name "$PM2_APP" --cwd "$ROOT/backend"
fi
pm2 save

echo "==> health (5 sn bekle)"
sleep 5
if curl -sf "http://127.0.0.1:${PORT:-5000}/api/health" >/dev/null; then
    echo "    /api/health OK"
else
    echo "    UYARI: /api/health yanıt vermedi — pm2 logs $PM2_APP"
fi

echo ""
echo "Deploy tamam. Site kökü (Nginx) şu olmalı:"
echo "  $ROOT/dist"
echo ""
echo "Sekme ikonu (panel logosu) için Nginx'e ekleyin (aaPanel site config):"
echo "  location = /favicon.ico {"
echo "    proxy_pass http://127.0.0.1:${PORT:-5000}/favicon.ico;"
echo "  }"
