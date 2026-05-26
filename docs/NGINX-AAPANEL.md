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

### Nginx — SPA fallback

aaPanel → site → **Config** sekmesi → `server { ... }` içinde tek bir `location /` bloğu olmalı:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Bu olmazsa `/urunler`, `/hesabim/siparisler` gibi URL’ler yenileyince 404 olur.

### Cache (isteğe bağlı ama önerilir)

```nginx
location ~* \.(?:js|css|woff2?|ico|png|jpg|jpeg|svg|webp)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

`index.html` cache’lenmesin (her deploy yeni asset hash kullanır):

```nginx
location = /index.html {
    add_header Cache-Control "no-store";
}
```

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
