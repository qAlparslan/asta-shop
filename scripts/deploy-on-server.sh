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
rm -rf dist
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
if pm2 describe astaticaret-api >/dev/null 2>&1; then
    pm2 restart astaticaret-api --update-env
else
    pm2 start backend/server.js --name astaticaret-api --cwd "$ROOT/backend"
fi
pm2 save

echo "==> health (5 sn bekle)"
sleep 5
if curl -sf "http://127.0.0.1:${PORT:-5000}/api/health" >/dev/null; then
    echo "    /api/health OK"
else
    echo "    UYARI: /api/health yanıt vermedi — pm2 logs astaticaret-api"
fi

echo ""
echo "Deploy tamam. Site kökü (Nginx) şu olmalı:"
echo "  $ROOT/dist"
