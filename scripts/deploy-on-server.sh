#!/usr/bin/env bash
# Sunucuda (aaPanel terminal): proje kökünden çalıştırın
#   cd /www/wwwroot/astaticaret.com && bash scripts/deploy-on-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# aaPanel Node — sürümünüz farklıysa düzenleyin
export PATH="/www/server/nodejs/v20.15.0/bin:${PATH:-}"

echo "==> git pull"
git pull --ff-only

if [[ ! -f backend/.env ]]; then
  echo "UYARI: backend/.env yok — sunucuya elle kopyalayın."
fi

echo "==> frontend build"
npm install
npm run build

echo "==> backend dependencies"
cd backend
npm install --production
cd "$ROOT"

echo "==> pm2 restart"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart astaticaret-api --update-env || pm2 start backend/server.js --name astaticaret-api
  pm2 save
else
  echo "pm2 bulunamadı — PATH ekleyin veya tam yolu kullanın."
  exit 1
fi

echo "==> health"
curl -sf "http://127.0.0.1:${PORT:-5000}/api/health" && echo "" || echo "(health endpoint yanıt vermedi)"

echo "Deploy tamam."
