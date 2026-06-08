# aaPanel / Nginx — site ve API yapılandırması

İki ayrı site var:

- `astaticaret.com` → React build (`dist/`)
- `api.astaticaret.com` → Node API (PM2 üzerinden `127.0.0.1:5000`)

---

## 1) astaticaret.com (mağaza)

### aaPanel paneli

1. **Websites** → `astaticaret.com` → **Settings**
2. **Site directory** → **`/www/wwwroot/astaticaret.com/dist`**
   (proje kökü DEĞİL; `dist` klasörü.)
3. **Save**

### Nginx — nereye yazılır?

1. aaPanel → **Websites** (Web sitesi)
2. **`astaticaret.com`** satırında **Settings** (Ayarlar) veya site adına tıkla
3. Üst menüden **Config** (Yapılandırma / Nginx config) sekmesi
4. Açılan metin kutusunda `server {` ile başlayan bloğu görürsün — **cache ve proxy satırlarını bu `server { ... }` bloğunun İÇİNE**, `location /` satırının **üstüne veya altına** yapıştır
5. **Save** → panel genelde Nginx’i otomatik yeniden yükler; hata verirse **Test** / **Reload** dene

Örnek (sadece `astaticaret.com` sitesi — API alt alan adı ayrı kalabilir):

```nginx
    # --- Bunları server { } içine ekle (girintiler paneldeki gibi olabilir) ---

    # API + yüklemeler aynı domainden (CORS/gecikme azalır; VITE_API_ORIGIN bos birakilabilir)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public";
    }

    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    location = /robots.txt {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    location = /favicon.ico {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        expires 7d;
    }

    # Ürün sayfaları — Google ilk HTML'de title/description/schema görsün (SPA SEO)
    location ^~ /urun/ {
        proxy_pass http://127.0.0.1:5000/shell/urun/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_intercept_errors off;
    }

    # dist içindeki JS/CSS/font — cache (PageSpeed "verimli önbellek" maddesi)
    location ~* \.(?:js|css|woff2?|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # index.html her deploy'da taze kalsin
    location = /index.html {
        add_header Cache-Control "no-store";
    }

    # SPA — en sonda veya mevcut location / ile birlestir
    location / {
        try_files $uri $uri/ /index.html;
    }
```

> **Önemli:** Cache bloğu **ayrı bir dosyaya değil**, doğrudan `astaticaret.com` sitesinin Nginx config ekranına yazılır. `api.astaticaret.com` sitesinin config’ine bu cache satırlarını ekleme.

Bu olmazsa `/urunler`, `/hesabim/siparisler` gibi URL’ler yenileyince 404 olur.

### Backend `.env` (ürün SEO kabuğu)

Sunucuda `backend/.env` içine dist yolunu ekleyin:

```
FRONTEND_DIST_PATH=/www/wwwroot/astaticaret.com/dist
FRONTEND_PUBLIC_URL=https://astaticaret.com
```

Deploy sonrası test — çıktıda ürün adı görünmeli:

```bash
curl -s "https://astaticaret.com/urun/SLUG-BURAYA" | grep -i "<title>"
```

Yalnızca `ASTA TİCARET` görünüyorsa Nginx `/urun/` proxy'si veya `FRONTEND_DIST_PATH` eksiktir.

---

## 2) api.astaticaret.com (Node API)

aaPanel → **Websites** → **Add site** → `api.astaticaret.com`

Site directory önemli değil (statik dosya sunmuyoruz). Asıl iş `location /` proxy:

```nginx
client_max_body_size 25m;

location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_read_timeout 120s;
}
```

> `client_max_body_size` görsel yüklemesi için.
> `X-Forwarded-*` başlıkları `.env`’deki `TRUST_PROXY=true` ile PayTR IP kontrolü için gerekli.

---

## 3) SSL

Her iki sitede aaPanel **SSL** → **Let’s Encrypt** → istek + **Force HTTPS** açın.

---

## 4) Deploy sonrası kontrol

```bash
curl -I https://astaticaret.com         # 200 OK
curl -s https://astaticaret.com | head -5
# <!doctype html> ... /assets/index-xxxxx.js  görmelisiniz
curl -s https://api.astaticaret.com/api/health
# {"status":"ok",...}
```

Hâlâ `/src/main.jsx` görünüyorsa site kökü yanlış; `dist/` yapın.
